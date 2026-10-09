const crypto = require('crypto');
const { ddbDocClient, GetCommand, TransactWriteCommand, QueryCommand, ScanCommand } = require('../utils/db');
const { sendNotification } = require('../utils/sns');
const { formatResponse, parseBody, authenticate, generateTicketId } = require('../utils/lambda');
const { signTicket } = require('../utils/qr');

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE || 'Museum_Bookings_dev';
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE || 'Museum_Schedules_dev';
const STATISTICS_TABLE = process.env.STATISTICS_TABLE || 'Museum_Statistics_dev';
const EXHIBITIONS_TABLE = process.env.EXHIBITIONS_TABLE || 'Museum_Exhibitions_dev';

module.exports.create = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required to book tickets' });
  }

  const body = parseBody(event);
  const { exhibitionId, dateSlot, numberOfVisitors } = body;

  if (!exhibitionId || !dateSlot || numberOfVisitors === undefined) {
    return formatResponse(400, { error: 'exhibitionId, dateSlot, and numberOfVisitors are required' });
  }

  const requestedTickets = parseInt(numberOfVisitors, 10);
  if (isNaN(requestedTickets) || requestedTickets < 1 || requestedTickets > 10) {
    return formatResponse(400, { error: 'Number of visitors must be between 1 and 10' });
  }

  // Generate IDs
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const currentYear = new Date().getFullYear();
  const bookingId = `MUS-${currentYear}-${randomSuffix}`;
  const ticketId = generateTicketId();
  const qrPayload = signTicket(bookingId);
  const createdAt = new Date().toISOString();
  const bookingDate = dateSlot.split('#')[0]; // Extract YYYY-MM-DD

  // Fetch exhibition title for display/receipt
  let exhibitionName = exhibitionId;
  try {
    const { Item: exh } = await ddbDocClient.send(new GetCommand({
      TableName: EXHIBITIONS_TABLE,
      Key: { exhibitionId }
    }));
    if (exh && exh.name) exhibitionName = exh.name;
  } catch (err) {
    // Non-blocking
  }

  const bookingItem = {
    bookingId,
    ticketId,
    qrPayload,
    visitorId: user.userId,
    userId: user.userId,
    visitorName: user.name || 'Visitor',
    visitorEmail: user.email,
    exhibitionId,
    exhibitionName,
    dateSlot,
    slotId: dateSlot,
    bookingDate,
    numberOfVisitors: requestedTickets,
    status: 'ACTIVE',
    createdAt
  };

  try {
    const transactParams = {
      TransactItems: [
        {
          Update: {
            TableName: SCHEDULES_TABLE,
            Key: { exhibitionId, dateSlot },
            UpdateExpression: 'SET bookedCount = bookedCount + :val',
            ConditionExpression: 'bookedCount + :val <= capacity AND #status = :active',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':val': requestedTickets, ':active': 'ACTIVE' }
          }
        },
        {
          Put: {
            TableName: BOOKINGS_TABLE,
            Item: bookingItem
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: 'GLOBAL_TOTALS' },
            UpdateExpression: 'ADD totalBookings :one, expectedVisitors :val',
            ExpressionAttributeValues: { ':one': 1, ':val': requestedTickets }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `DAILY#${bookingDate}` },
            UpdateExpression: 'ADD totalBookings :one, expectedVisitors :val',
            ExpressionAttributeValues: { ':one': 1, ':val': requestedTickets }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `EXH#${exhibitionId}` },
            UpdateExpression: 'ADD totalBookings :one, totalVisitors :val',
            ExpressionAttributeValues: { ':one': 1, ':val': requestedTickets }
          }
        }
      ]
    };

    await ddbDocClient.send(new TransactWriteCommand(transactParams));

    // Send SNS Notification
    const notifMessage = `Booking Confirmed!\nBooking ID: ${bookingId}\nTicket ID: ${ticketId}\nExhibition: ${exhibitionName}\nDate/Slot: ${dateSlot}\nVisitors: ${requestedTickets}`;
    await sendNotification(notifMessage, 'Museum Booking Confirmation', {
      recipient: user.email,
      type: 'BOOKING_CONFIRMATION',
      bookingId,
      ticketId
    });

    return formatResponse(201, {
      message: 'Booking confirmed successfully',
      booking: bookingItem
    });
  } catch (error) {
    console.error('Booking failed:', error);
    if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { error: 'Sorry, this time slot does not have sufficient capacity remaining.' });
    }
    return formatResponse(500, { error: 'Unable to complete booking. Please try again.' });
  }
};

module.exports.cancel = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required' });
  }

  const bookingId = event.pathParameters?.id || event.params?.id;

  try {
    const { Item: booking } = await ddbDocClient.send(new GetCommand({
      TableName: BOOKINGS_TABLE,
      Key: { bookingId }
    }));

    if (!booking) return formatResponse(404, { error: 'Booking not found' });

    // OWNERSHIP CHECK: Only the visitor who booked it or an Admin can cancel
    const userRole = (user.role || '').toUpperCase();
    if (booking.visitorId !== user.userId && booking.userId !== user.userId && userRole !== 'ADMIN') {
      return formatResponse(403, { error: 'Forbidden: You do not own this booking' });
    }

    if (booking.status === 'CANCELLED') {
      return formatResponse(400, { error: 'Booking is already cancelled' });
    }

    if (booking.status === 'USED') {
      return formatResponse(400, { error: 'Cannot cancel an already admitted ticket' });
    }

    const transactParams = {
      TransactItems: [
        {
          Update: {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
            UpdateExpression: 'SET #status = :cancelled',
            ConditionExpression: '#status = :active',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':cancelled': 'CANCELLED', ':active': 'ACTIVE' }
          }
        },
        {
          Update: {
            TableName: SCHEDULES_TABLE,
            Key: { exhibitionId: booking.exhibitionId, dateSlot: booking.slotId || booking.dateSlot },
            UpdateExpression: 'SET bookedCount = bookedCount - :val',
            ExpressionAttributeValues: { ':val': booking.numberOfVisitors }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: 'GLOBAL_TOTALS' },
            UpdateExpression: 'ADD cancelledBookings :one, expectedVisitors :negVal',
            ExpressionAttributeValues: { ':one': 1, ':negVal': -booking.numberOfVisitors }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `DAILY#${booking.bookingDate}` },
            UpdateExpression: 'ADD cancelledBookings :one, expectedVisitors :negVal',
            ExpressionAttributeValues: { ':one': 1, ':negVal': -booking.numberOfVisitors }
          }
        },
        {
          Update: {
            TableName: STATISTICS_TABLE,
            Key: { statKey: `EXH#${booking.exhibitionId}` },
            UpdateExpression: 'ADD cancelledBookings :one, totalVisitors :negVal',
            ExpressionAttributeValues: { ':one': 1, ':negVal': -booking.numberOfVisitors }
          }
        }
      ]
    };

    await ddbDocClient.send(new TransactWriteCommand(transactParams));

    // Send SNS cancellation notice
    const notifMessage = `Booking Cancelled.\nBooking ID: ${bookingId}\nYour ticket has been cancelled and spot released.`;
    await sendNotification(notifMessage, 'Museum Ticket Cancellation', {
      recipient: booking.visitorEmail || user.email,
      type: 'BOOKING_CANCELLATION',
      bookingId
    });

    return formatResponse(200, { message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancellation error:', error);
    if (error.name === 'TransactionCanceledException' || error.name === 'ConditionalCheckFailedException') {
      return formatResponse(400, { error: 'Booking cannot be cancelled in its current state' });
    }
    return formatResponse(500, { error: 'Could not cancel booking' });
  }
};

module.exports.myBookings = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required' });
  }

  try {
    const { Items } = await ddbDocClient.send(new QueryCommand({
      TableName: BOOKINGS_TABLE,
      IndexName: 'VisitorHistoryIndex',
      KeyConditionExpression: 'visitorId = :visitorId',
      ExpressionAttributeValues: { ':visitorId': user.userId }
    }));

    const bookings = (Items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return formatResponse(200, bookings);
  } catch (error) {
    console.error('Fetch myBookings error:', error);
    return formatResponse(500, { error: 'Could not fetch visitor history' });
  }
};

module.exports.getBooking = async (event) => {
  let user;
  try {
    user = authenticate(event);
  } catch (e) {
    return formatResponse(401, { error: 'Authentication required' });
  }

  const bookingId = event.pathParameters?.id || event.params?.id;

  try {
    const { Item: booking } = await ddbDocClient.send(new GetCommand({
      TableName: BOOKINGS_TABLE,
      Key: { bookingId }
    }));

    if (!booking) return formatResponse(404, { error: 'Booking not found' });

    // Ownership check
    const userRole = (user.role || '').toUpperCase();
    if (booking.visitorId !== user.userId && booking.userId !== user.userId && userRole !== 'ADMIN') {
      return formatResponse(403, { error: 'Forbidden: Unauthorized to view this booking' });
    }

    return formatResponse(200, booking);
  } catch (error) {
    console.error('Get booking error:', error);
    return formatResponse(500, { error: 'Could not fetch booking' });
  }
};
