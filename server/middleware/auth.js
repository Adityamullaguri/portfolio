// server/middleware/auth.js — JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'portfolio-cms-secret-key-replace-in-production';

function requireAuth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, signToken };

