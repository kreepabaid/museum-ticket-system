const express = require('express');
const router = express.Router();
const { ddbDocClient, PutCommand, QueryCommand, UpdateCommand } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const SCHEDULES_TABLE = process.env.SCHEDULES_TABLE;

// Get schedules for an exhibition
// Mounted under /exhibitions
router.get('/:id/schedules', async (req, res) => {
  const exhibitionId = req.params.id;
  try {
    const { Items } = await ddbDocClient.send(new QueryCommand({
      TableName: SCHEDULES_TABLE,
      KeyConditionExpression: 'exhibitionId = :exhibitionId',
      ExpressionAttributeValues: {
        ':exhibitionId': exhibitionId
      }
    }));
    res.json(Items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch schedules' });
  }
});

// Create a schedule slot (Admin only)
router.post('/:id/schedules', authenticateToken, requireAdmin, async (req, res) => {
  const exhibitionId = req.params.id;
  const { date, startTime, endTime, capacity } = req.body;

  if (!date || !startTime || !endTime || capacity === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Format dateSlot as YYYY-MM-DD#HH:MM
  const dateSlot = `${date}#${startTime}`;

  const item = {
    exhibitionId,
    dateSlot,
    date,
    startTime,
    endTime,
    capacity: parseInt(capacity),
    bookedCount: 0,
    status: 'ACTIVE'
  };

  try {
    await ddbDocClient.send(new PutCommand({
      TableName: SCHEDULES_TABLE,
      Item: item
    }));
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create schedule' });
  }
});

// Update schedule status (Admin only)
router.put('/:id/schedules/:dateSlot', authenticateToken, requireAdmin, async (req, res) => {
  const exhibitionId = req.params.id;
  const dateSlot = req.params.dateSlot; // URL encoded
  const { status, capacity } = req.body;

  try {
    const command = new UpdateCommand({
      TableName: SCHEDULES_TABLE,
      Key: { exhibitionId, dateSlot },
      UpdateExpression: 'set #status = :status, capacity = :capacity',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':capacity': capacity },
      ReturnValues: 'ALL_NEW'
    });
    const { Attributes } = await ddbDocClient.send(command);
    res.json(Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update schedule' });
  }
});

module.exports = router;
