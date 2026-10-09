const express = require('express');
const router = express.Router();
const { ddbDocClient, ScanCommand } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const BOOKINGS_TABLE = process.env.BOOKINGS_TABLE;
const EXHIBITIONS_TABLE = process.env.EXHIBITIONS_TABLE;
const ENTRY_RECORDS_TABLE = process.env.ENTRY_RECORDS_TABLE;

router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Note: For a production app at massive scale, scanning is inefficient.
    // We would use DynamoDB Streams -> Lambda -> Stats Table to maintain running totals.
    // For this academic prototype, we aggregate via scan to demonstrate data retrieval.

    // Get all exhibitions
    const { Items: exhibitions } = await ddbDocClient.send(new ScanCommand({
      TableName: EXHIBITIONS_TABLE
    }));

    // Get all bookings
    const { Items: bookings } = await ddbDocClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE
    }));

    // Get all entries
    const { Items: entries } = await ddbDocClient.send(new ScanCommand({
      TableName: ENTRY_RECORDS_TABLE
    }));

    const activeExhibitions = exhibitions ? exhibitions.filter(e => e.status === 'ACTIVE').length : 0;
    
    let totalBookings = 0;
    let cancelledBookings = 0;
    let totalExpectedVisitors = 0;

    if (bookings) {
        bookings.forEach(b => {
            if (b.status === 'CONFIRMED') {
                totalBookings++;
                totalExpectedVisitors += b.numberOfVisitors;
            } else if (b.status === 'CANCELLED') {
                cancelledBookings++;
            }
        });
    }

    const today = new Date().toISOString().split('T')[0];
    let visitorsToday = 0;

    if (entries) {
        entries.forEach(e => {
            if (e.entryTime && e.entryTime.startsWith(today)) {
                visitorsToday++;
            }
        });
    }

    res.json({
      activeExhibitions,
      totalBookings,
      cancelledBookings,
      totalExpectedVisitors,
      visitorsToday,
      totalEntries: entries ? entries.length : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch dashboard statistics' });
  }
});

module.exports = router;
