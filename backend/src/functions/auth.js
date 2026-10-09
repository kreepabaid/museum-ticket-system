const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { ddbDocClient, PutCommand, GetCommand, ScanCommand } = require('../utils/db');
const { JWT_SECRET, authenticateToken, requireAdmin } = require('../utils/auth');

const USERS_TABLE = process.env.USERS_TABLE;

// Register User
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const { Items } = await ddbDocClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }));

    if (Items && Items.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const userRole = role === 'Admin' ? 'Admin' : 'Visitor';

    const userItem = {
      userId,
      name,
      email,
      phone,
      role: userRole,
      passwordHash,
      createdAt
    };

    await ddbDocClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userItem
    }));

    // Generate token
    const token = jwt.sign({ userId, email, role: userRole }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ message: 'User registered successfully', token, user: { userId, name, email, role: userRole } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { Items } = await ddbDocClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email }
    }));

    if (!Items || Items.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = Items[0];
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.userId, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { Item } = await ddbDocClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: req.user.userId }
    }));

    if (!Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: { userId: Item.userId, name: Item.name, email: Item.email, phone: Item.phone, role: Item.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not fetch user profile' });
  }
});

module.exports = router;
