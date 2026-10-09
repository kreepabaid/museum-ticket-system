const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'museum_secret_for_academic_demo_only';

const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
};

const parseBody = (event) => {
  if (!event) return {};
  if (typeof event.body === 'object' && event.body !== null) {
    return event.body;
  }
  try {
    return JSON.parse(event.body || '{}');
  } catch (e) {
    return {};
  }
};

const authenticate = (event) => {
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;
  if (!authHeader) throw new Error('Unauthorized');

  const parts = authHeader.split(' ');
  const token = parts.length === 2 ? parts[1] : parts[0];

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Forbidden');
  }
};

const generateTicketId = () => {
  return `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

module.exports = {
  formatResponse,
  parseBody,
  authenticate,
  generateTicketId,
  JWT_SECRET
};
