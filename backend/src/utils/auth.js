const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'museum_secret_for_academic_demo_only';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in' });
    }
    const currentRole = (req.user.role || '').toUpperCase();
    const targetRole = (role || '').toUpperCase();

    if (currentRole === targetRole) {
      next();
    } else {
      return res.status(403).json({ error: `Forbidden: ${role} access required` });
    }
  };
};

const requireAdmin = requireRole('ADMIN');

const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  hashPassword,
  comparePassword,
  generateToken,
  JWT_SECRET
};
