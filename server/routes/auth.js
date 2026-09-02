// server/routes/auth.js — Authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Login attempt tracking (simple in-memory rate limiting)
const loginAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 15 * 60 * 1000; }
  return entry;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.ip;
  const entry = checkRateLimit(ip);
  if (entry.count >= 10) {
    return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes.' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    entry.count++;
    loginAttempts.set(ip, entry);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Reset rate limit on successful login
  loginAttempts.delete(ip);

  const token = signToken({ id: user.id, email: user.email });
  res.cookie('admin_token', token, COOKIE_OPTS);

  // Log activity
  try {
    db.prepare(`INSERT INTO activity_log (action,entity,detail) VALUES (?,?,?)`)
      .run('LOGIN', 'auth', `Admin logged in: ${user.email}`);
  } catch(e) {}

  res.json({ success: true, user: { id: user.id, email: user.email } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

// GET /api/auth/me — verify session
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/password — change password
router.put('/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  db.prepare(`INSERT INTO activity_log (action,entity,detail) VALUES (?,?,?)`)
    .run('UPDATE', 'password', 'Admin changed password');

  res.json({ success: true });
});

module.exports = router;

