const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ddbDocClient, GetCommand, ScanCommand, PutCommand, UpdateCommand } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const ENTRY_RECORDS_TABLE = process.env.ENTRY_RECORDS_TABLE;

// Admin Validate Ticket
router.post('/validate', authenticateToken, requireAdmin, async (req, res) => {
  const { ticketId } = req.body;
  const adminId = req.user.userId;

  if (!ticketId) {
    return res.status(400).json({ error: 'Ticket ID is required' });
  }

  try {
    // 1. Find the booking by ticketId
    // Since ticketId is not the PK, we need to scan or use a GSI.
    // For academic simplicity, we scan. In production, we'd add a TicketIndex or make Ticket ID the PK.
    const { Items: bookings } = await ddbDocClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE,
      FilterExpression: 'ticketId = :ticketId',
      ExpressionAttributeValues: { ':ticketId': ticketId }
    }));

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: 'INVALID TICKET' });
    }

    const booking = bookings[0];

    // 2. Validate ticket status
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'TICKET CANCELLED' });
    }

    // 3. Check if already used
    const { Items: entries } = await ddbDocClient.send(new ScanCommand({
      TableName: ENTRY_RECORDS_TABLE,
      FilterExpression: 'ticketId = :ticketId',
      ExpressionAttributeValues: { ':ticketId': ticketId }
    }));

    if (entries && entries.length > 0) {
      return res.status(400).json({ error: 'TICKET ALREADY USED' });
    }

    // 4. Record Entry
    const entryId = uuidv4();
    const entryRecord = {
      entryId,
      ticketId,
      bookingId: booking.bookingId,
      visitorId: booking.visitorId,
      exhibitionId: booking.exhibitionId,
      entryTime: new Date().toISOString(),
      validatedBy: adminId,
      status: 'USED'
    };

    await ddbDocClient.send(new PutCommand({
      TableName: ENTRY_RECORDS_TABLE,
      Item: entryRecord
    }));

    res.json({ message: 'VALID TICKET — ENTRY ALLOWED', entryRecord, bookingDetails: booking });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'This ticket could not be verified.' });
  }
});

// Get ticket details (Public / Auth)
router.get('/:ticketId', async (req, res) => {
    // Similar to above, find booking by ticket id
    try {
        const { ticketId } = req.params;
        const { Items: bookings } = await ddbDocClient.send(new ScanCommand({
          TableName: BOOKINGS_TABLE,
          FilterExpression: 'ticketId = :ticketId',
          ExpressionAttributeValues: { ':ticketId': ticketId }
        }));
    
        if (!bookings || bookings.length === 0) {
          return res.status(404).json({ error: 'INVALID TICKET' });
        }
        res.json(bookings[0]);
    } catch(err) {
        res.status(500).json({error: 'Could not fetch ticket'});
    }
});

module.exports = router;
