// server/server.js — Main Express application
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Cookie parsing (manual, avoid extra dep) ──
function parseCookies(req, res, next) {
  req.cookies = {};
  const hdr = req.headers.cookie;
  if (hdr) {
    hdr.split(';').forEach(pair => {
      const [k, ...v] = pair.trim().split('=');
      req.cookies[k.trim()] = decodeURIComponent(v.join('='));
    });
  }
  next();
}

app.use(parseCookies);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Ensure uploads directory ──
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
['','skills','projects','certificates','internships','about','home','misc'].forEach(sub => {
  const d = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Serve uploaded files ──
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));

// ── Admin area: redirect /admin → /admin/ ──
app.get('/admin', (req, res) => res.redirect('/admin/'));

// ── Serve admin login page ──
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

// ── Serve admin dashboard ──
app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

// Serve admin static assets
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// ── Serve public portfolio ──
// Static assets (CSS, JS, images, fonts, assets/*) must come BEFORE catch-all
app.use(express.static(path.join(__dirname, '..'), {
  index: false // Don't auto-serve index.html here; we control it below
}));

// Root → serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Auto-seed if needed ──
try {
  const { seed } = require('./seed');
  seed();
} catch (err) {
  console.error('Seed error:', err.message);
}

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio CMS running at: http://localhost:${PORT}`);
  console.log(`📊 Admin Dashboard:          http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin Login:              http://localhost:${PORT}/admin/login`);
  console.log(`\nFirst time? Run: npm run seed\n`);
});

module.exports = app;

