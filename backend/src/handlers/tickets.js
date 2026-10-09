const crypto = require('crypto');
const { ddbDocClient, ScanCommand, PutCommand, TransactWriteCommand, GetCommand } = require('../utils/db');
const { formatResponse, parseBody, authenticate } = require('../utils/lambda');
const { verifyTicketPayload } = require('../utils/qr');

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE || 'Museum_Bookings_dev';
const ENTRY_RECORDS_TABLE = process.env.ENTRY_RECORDS_TABLE || 'Museum_EntryRecords_dev';
const STATISTICS_TABLE = process.env.STATISTICS_TABLE || 'Museum_Statistics_dev';

module.exports.validate = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required' });
  }

  // ROLE CHECK: ADMIN only
  if ((user.role || '').toUpperCase() !== 'ADMIN') {
    return formatResponse(403, { error: 'Forbidden: Admin access required for ticket validation' });
  }

  const { ticketId, qrPayload } = parseBody(event);
  const rawInput = (qrPayload || ticketId || '').trim();

  if (!rawInput) {
    return formatResponse(400, { error: 'Ticket ID or QR code payload is required' });
  }

  // Cryptographic QR verification
  let targetId = rawInput;
  if (rawInput.includes('.')) {
    const verification = verifyTicketPayload(rawInput);
    if (!verification.valid) {
      return formatResponse(400, {
        error: 'TAMPERED / INVALID QR CODE: Cryptographic signature mismatch',
        reason: verification.error
      });
    }
    targetId = verification.bookingId;
  }

  try {
    // 1. Locate booking by ticketId or bookingId
    const { Items: bookings } = await ddbDocClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE,
      FilterExpression: 'ticketId = :id OR bookingId = :id',
      ExpressionAttributeValues: { ':id': targetId }
    }));

    if (!bookings || bookings.length === 0) {
      return formatResponse(404, { error: 'INVALID TICKET: No matching booking found' });
    }

    const booking = bookings[0];

    // 2. Status validations
    if (booking.status === 'CANCELLED') {
      return formatResponse(400, {
        error: 'TICKET CANCELLED',
        details: 'This booking was cancelled and is no longer valid for admission.'
      });
    }

    if (booking.status === 'USED') {
      return formatResponse(409, {
        error: 'TICKET ALREADY USED',
        details: `This pass was already scanned for entry (${booking.numberOfVisitors} visitors admitted).`
      });
    }

    // 3. Double-check EntryRecords table for duplicate scans
    const { Items: existingEntries } = await ddbDocClient.send(new ScanCommand({
      TableName: ENTRY_RECORDS_TABLE,
      FilterExpression: 'bookingId = :bId OR ticketId = :tId',
      ExpressionAttributeValues: {
        ':bId': booking.bookingId,
        ':tId': booking.ticketId
      }
    }));

    if (existingEntries && existingEntries.length > 0) {
      return formatResponse(409, {
        error: 'TICKET ALREADY USED',
        details: `Ticket already scanned at ${existingEntries[0].enteredAt || existingEntries[0].entryTime}`
      });
    }

    // 4. Atomic transaction:
    // (a) update booking status = 'USED'
    // (b) put EntryRecord with attribute_not_exists condition
    // (c) update Statistics
    const entryId = `ENT-${crypto.randomUUID().slice(0, 8)}`;
    const enteredAt = new Date().toISOString();
    const entryDate = enteredAt.split('T')[0];

    const entryRecord = {
      entryId,
      bookingId: booking.bookingId,
      ticketId: booking.ticketId,
      visitorId: booking.visitorId,
      visitorName: booking.visitorName || 'Visitor',
      exhibitionId: booking.exhibitionId,
      exhibitionName: booking.exhibitionName || booking.exhibitionId,
      numberOfVisitors: booking.numberOfVisitors || 1,
      entryDate,
      enteredAt,
      entryTime: enteredAt,
      validatedBy: user.userId,
      validatedByName: user.name || 'Admin Curator',
      status: 'USED'
    };

    const transactParams = {
      TransactItems: [
        {
          Update: {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId: booking.bookingId },
            UpdateExpression: 'SET #status = :used, admittedAt = :enteredAt',
            ConditionExpression: '#status = :active',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':used': 'USED', ':active': 'ACTIVE', ':enteredAt': enteredAt }
          }
        },
        {
          Put: {
            TableName: ENTRY_RECORDS_TABLE,
            Item: entryRecord,
            ConditionExpression: 'attribute_not_exists(bookingId)'
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: 'GLOBAL_TOTALS' },
            UpdateExpression: 'ADD totalEntries :val',
            ExpressionAttributeValues: { ':val': booking.numberOfVisitors }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `DAILY#${entryDate}` },
            UpdateExpression: 'ADD totalEntries :val',
            ExpressionAttributeValues: { ':val': booking.numberOfVisitors }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `EXH#${booking.exhibitionId}` },
            UpdateExpression: 'ADD totalEntries :val',
            ExpressionAttributeValues: { ':val': booking.numberOfVisitors }
          }
        }
      ]
    };

    await ddbDocClient.send(new TransactWriteCommand(transactParams));

    return formatResponse(200, {
      message: 'VALID TICKET — ENTRY ALLOWED',
      entryRecord,
      bookingDetails: {
        bookingId: booking.bookingId,
        ticketId: booking.ticketId,
        visitorName: booking.visitorName || 'Visitor',
        exhibitionId: booking.exhibitionId,
        exhibitionName: booking.exhibitionName || booking.exhibitionId,
        slotId: booking.slotId || booking.dateSlot,
        numberOfVisitors: booking.numberOfVisitors,
        admittedAt: enteredAt
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { error: 'TICKET ALREADY USED: Duplicate scan rejected' });
    }
    return formatResponse(500, { error: 'Ticket could not be verified due to an internal error' });
  }
};

module.exports.getTicket = async (event) => {
  try {
    const rawId = event.pathParameters?.ticketId || event.params?.ticketId;
    const { Items: bookings } = await ddbDocClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE,
      FilterExpression: 'ticketId = :id OR bookingId = :id',
      ExpressionAttributeValues: { ':id': rawId }
    }));

    if (!bookings || bookings.length === 0) {
      return formatResponse(404, { error: 'INVALID TICKET: Ticket not found' });
    }

    return formatResponse(200, bookings[0]);
  } catch (err) {
    console.error('Get ticket error:', err);
    return formatResponse(500, { error: 'Could not fetch ticket' });
  }
};
