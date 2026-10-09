const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { ddbDocClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../utils/auth');

const EXHIBITIONS_TABLE = process.env.EXHIBITIONS_TABLE;

// Get all exhibitions
router.get('/', async (req, res) => {
  try {
    const { Items } = await ddbDocClient.send(new ScanCommand({
      TableName: EXHIBITIONS_TABLE
    }));
    res.json(Items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch exhibitions' });
  }
});

// Get exhibition by ID
router.get('/:id', async (req, res) => {
  try {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: EXHIBITIONS_TABLE,
      Key: { exhibitionId: req.params.id }
    }));
    if (!Item) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }
    res.json(Item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch exhibition' });
  }
});

// Create exhibition (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, category, location, startDate, endDate, imageUrl } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
  }

  const exhibitionId = uuidv4();
  const createdAt = new Date().toISOString();

  const item = {
    exhibitionId,
    name,
    description,
    category,
    location,
    startDate,
    endDate,
    imageUrl,
    status: 'ACTIVE',
    createdAt
  };

  try {
    await ddbDocClient.send(new PutCommand({
      TableName: EXHIBITIONS_TABLE,
      Item: item
    }));
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not create exhibition' });
  }
});

// Update exhibition (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, category, location, startDate, endDate, imageUrl, status } = req.body;
  const exhibitionId = req.params.id;

  try {
    const command = new UpdateCommand({
      TableName: EXHIBITIONS_TABLE,
      Key: { exhibitionId },
      UpdateExpression: 'set #name = :name, description = :desc, category = :cat, #loc = :loc, startDate = :start, endDate = :end, imageUrl = :img, #status = :status',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#loc': 'location',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':desc': description,
        ':cat': category,
        ':loc': location,
        ':start': startDate,
        ':end': endDate,
        ':img': imageUrl,
        ':status': status
      },
      ReturnValues: 'ALL_NEW'
    });

    const { Attributes } = await ddbDocClient.send(command);
    res.json(Attributes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update exhibition' });
  }
});

// Delete/Deactivate exhibition (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const exhibitionId = req.params.id;
  try {
    await ddbDocClient.send(new UpdateCommand({
      TableName: EXHIBITIONS_TABLE,
      Key: { exhibitionId },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'INACTIVE' }
    }));
    res.json({ message: 'Exhibition deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete exhibition' });
  }
});

module.exports = router;
