// server/routes/public.js — Public read-only API endpoints (no auth required)
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function parseJSON(val, fallback = []) {
  try { return JSON.parse(val); } catch { return fallback; }
}

// GET /api/home
router.get('/home', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM home_content WHERE id = 1').get();
  if (!row) return res.json({});
  res.json({ ...row, chips: parseJSON(row.chips, []) });
});

// GET /api/about
router.get('/about', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM about_content WHERE id = 1').get();
  if (!row) return res.json({});
  res.json({
    ...row,
    bio: parseJSON(row.bio, []),
    info_rows: parseJSON(row.info_rows, [])
  });
});

// GET /api/skills
router.get('/skills', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM skills WHERE active = 1 ORDER BY display_order ASC').all();
  res.json(rows);
});

// GET /api/internships
router.get('/internships', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM internships WHERE active = 1 ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({
    ...r,
    technologies: parseJSON(r.technologies, []),
    responsibilities: parseJSON(r.responsibilities, []),
    achievements: parseJSON(r.achievements, [])
  })));
});

// GET /api/projects
router.get('/projects', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects WHERE published = 1 ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, tags: parseJSON(r.tags, []) })));
});

// GET /api/certificates
router.get('/certificates', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM certificates WHERE active = 1 ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, skills_list: parseJSON(r.skills_list, []) })));
});

// GET /api/education
router.get('/education', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM education WHERE active = 1 ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, achievements: parseJSON(r.achievements, []) })));
});

// GET /api/social-links
router.get('/social-links', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM social_links WHERE active = 1 ORDER BY display_order ASC').all();
  res.json(rows);
});

// GET /api/navbar
router.get('/navbar', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM navbar_items WHERE visible = 1 ORDER BY display_order ASC').all();
  res.json(rows);
});

// GET /api/settings
router.get('/settings', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
  res.json(row || {});
});

// GET /api/contact-settings
router.get('/contact-settings', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM contact_settings WHERE id = 1').get();
  res.json(row || {});
});

// POST /api/contact — submit contact form
router.post('/contact', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT form_enabled FROM contact_settings WHERE id = 1').get();
  if (settings && !settings.form_enabled) {
    return res.status(403).json({ error: 'Contact form is currently disabled.' });
  }

  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (max 5000 characters).' });
  }

  const result = db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)')
    .run(name.trim().slice(0,100), email.trim().slice(0,200), message.trim().slice(0,5000));

  res.json({ success: true, id: result.lastInsertRowid });
});

module.exports = router;

