const crypto = require('crypto');

const TICKET_SECRET = process.env.TICKET_SECRET || 'museum_secure_ticket_signing_secret_key_2026';

/**
 * Generate HMAC-SHA256 signature for a booking / ticket ID
 */
function signTicket(bookingId) {
  const hmac = crypto.createHmac('sha256', TICKET_SECRET);
  hmac.update(bookingId);
  const signature = hmac.digest('hex');
  return `${bookingId}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signature using timingSafeEqual to avoid timing attacks
 */
function verifyTicketPayload(payload) {
  if (!payload || typeof payload !== 'string') {
    return { valid: false, bookingId: null, error: 'Empty or invalid QR payload' };
  }

  // Support either full payload 'MUS-2026-B001.signature' or plain bookingId if unsigned demo mode
  const parts = payload.trim().split('.');
  if (parts.length === 1) {
    // If only bookingId or ticketId provided, fallback to allow verification by ID
    return { valid: true, bookingId: parts[0], signatureProvided: false };
  }

  const [bookingId, signature] = parts;
  if (!bookingId || !signature) {
    return { valid: false, bookingId: null, error: 'Malformed payload structure' };
  }

  const hmac = crypto.createHmac('sha256', TICKET_SECRET);
  hmac.update(bookingId);
  const expectedSignature = hmac.digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, bookingId, error: 'Invalid QR signature length' };
  }

  const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  if (!matches) {
    return { valid: false, bookingId, error: 'Invalid cryptographically forged QR ticket' };
  }

  return { valid: true, bookingId, signatureProvided: true };
}

module.exports = {
  signTicket,
  verifyTicketPayload,
  TICKET_SECRET
};
