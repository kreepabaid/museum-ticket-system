const crypto = require('crypto');
const { ddbDocClient, PutCommand, ScanCommand, QueryCommand } = require('../utils/db');
const { formatResponse, parseBody, authenticate, JWT_SECRET } = require('../utils/lambda');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

const USERS_TABLE = process.env.USERS_TABLE || 'Museum_Users_dev';

module.exports.register = async (event) => {
  const body = parseBody(event);
  const { name, email, phone, password } = body;

  if (!name || !email || !password) {
    return formatResponse(400, { error: 'Name, email, and password are required' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return formatResponse(400, { error: 'Please provide a valid email address' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if email already exists using GSI or Scan
    const { Items } = await ddbDocClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': normalizedEmail }
    }));

    if (Items && Items.length > 0) {
      return formatResponse(409, { error: 'User with this email already exists' });
    }

    const userId = `usr-${crypto.randomUUID()}`;
    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();

    // SECURITY REQUIREMENT: Registration ALWAYS creates VISITOR to prevent privilege escalation
    const userRole = 'VISITOR';

    const userItem = {
      userId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      role: userRole,
      passwordHash,
      createdAt
    };

    await ddbDocClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: userItem
    }));

    const token = generateToken({
      userId,
      email: normalizedEmail,
      role: userRole,
      name: userItem.name
    });

    return formatResponse(201, {
      message: 'User registered successfully',
      token,
      user: {
        userId,
        name: userItem.name,
        email: normalizedEmail,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return formatResponse(500, { error: 'Could not register user' });
  }
};

module.exports.login = async (event) => {
  const body = parseBody(event);
  const { email, password } = body;

  if (!email || !password) {
    return formatResponse(400, { error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { Items } = await ddbDocClient.send(new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': normalizedEmail }
    }));

    if (!Items || Items.length === 0) {
      return formatResponse(401, { error: 'Invalid email or password' });
    }

    const user = Items[0];
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return formatResponse(401, { error: 'Invalid email or password' });
    }

    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      name: user.name
    });

    return formatResponse(200, {
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return formatResponse(500, { error: 'Login failed' });
  }
};

module.exports.me = async (event) => {
  try {
    const user = authenticate(event);
    return formatResponse(200, {
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return formatResponse(401, { error: error.message || 'Unauthorized' });
  }
};
