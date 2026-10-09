const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ddbDocClient, GetCommand, TransactWriteCommand, QueryCommand } = require('../utils/db');
const { sendNotification } = require('../utils/sns');
const { authenticateToken } = require('../utils/auth');

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE;

// Create a booking
router.post('/', authenticateToken, async (req, res) => {
  const visitorId = req.user.userId;
  const { exhibitionId, dateSlot, numberOfVisitors } = req.body;

  if (!exhibitionId || !dateSlot || !numberOfVisitors) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const requestedTickets = parseInt(numberOfVisitors);
  if (requestedTickets <= 0) {
    return res.status(400).json({ error: 'Invalid number of visitors' });
  }

  const bookingId = `MUS-${new Date().getFullYear()}-${uuidv4().split('-')[0].toUpperCase()}`;
  const ticketId = `TKT-${uuidv4().split('-')[0].toUpperCase()}`;
  const createdAt = new Date().toISOString();
  // Extract date from dateSlot (YYYY-MM-DD#HH:MM)
  const bookingDate = dateSlot.split('#')[0];

  const bookingItem = {
    bookingId,
    visitorId,
    exhibitionId,
    slotId: dateSlot,
    bookingDate,
    numberOfVisitors: requestedTickets,
    status: 'CONFIRMED',
    ticketId,
    createdAt
  };

  try {
    // 1. Transaction to reserve capacity and create booking
    const transactParams = {
      TransactItems: [
        {
          Update: {
            TableName: SCHEDULES_TABLE,
            Key: { exhibitionId, dateSlot },
            UpdateExpression: 'SET bookedCount = bookedCount + :val',
            ConditionExpression: 'bookedCount + :val <= capacity AND #status = :active',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':val': requestedTickets,
              ':active': 'ACTIVE'
            }
          }
        },
        {
          Put: {
            TableName: BOOKINGS_TABLE,
            Item: bookingItem
          }
        }
      ]
    };

    await ddbDocClient.send(new TransactWriteCommand(transactParams));

    // 2. Send SNS Notification
    const message = `Your museum visit has been confirmed.\nBooking ID: ${bookingId}\nTicket ID: ${ticketId}\nVisitors: ${requestedTickets}`;
    await sendNotification(message, 'Booking Confirmation');

    res.status(201).json({ message: 'Booking successful', booking: bookingItem });
  } catch (error) {
    console.error('Booking failed:', error);
    if (error.name === 'TransactionCanceledException') {
      return res.status(409).json({ error: 'Sorry, this time slot is no longer available or does not have enough capacity.' });
    }
    res.status(500).json({ error: 'Unable to complete booking. Please try again.' });
  }
});

// Get visitor's bookings
router.get('/my', authenticateToken, async (req, res) => {
  const visitorId = req.user.userId;
  try {
    const { Items } = await ddbDocClient.send(new QueryCommand({
      TableName: BOOKINGS_TABLE,
      IndexName: 'VisitorHistoryIndex',
      KeyConditionExpression: 'visitorId = :visitorId',
      ExpressionAttributeValues: {
        ':visitorId': visitorId
      }
    }));
    res.json(Items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

// Cancel a booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  const visitorId = req.user.userId;

  try {
    // First get the booking to verify ownership and details
    const { Item: booking } = await ddbDocClient.send(new GetCommand({
      TableName: BOOKINGS_TABLE,
      Key: { bookingId }
    }));

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.visitorId !== visitorId && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Transaction to update booking status and free capacity
    const transactParams = {
      TransactItems: [
        {
          Update: {
            TableName: BOOKINGS_TABLE,
            Key: { bookingId },
            UpdateExpression: 'SET #status = :cancelled',
            ConditionExpression: '#status = :confirmed',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':cancelled': 'CANCELLED',
              ':confirmed': 'CONFIRMED'
            }
          }
        },
        {
          Update: {
            TableName: SCHEDULES_TABLE,
            Key: { exhibitionId: booking.exhibitionId, dateSlot: booking.slotId },
            UpdateExpression: 'SET bookedCount = bookedCount - :val',
            ExpressionAttributeValues: {
              ':val': booking.numberOfVisitors
            }
          }
        }
      ]
    };

    await ddbDocClient.send(new TransactWriteCommand(transactParams));

    await sendNotification(`Your museum ticket has been cancelled successfully. Booking ID: ${bookingId}`, 'Booking Cancelled');

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not cancel booking' });
  }
});

module.exports = router;
