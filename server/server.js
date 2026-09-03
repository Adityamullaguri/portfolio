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

// ── Ensure uploads directories exist and sync files ──
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const ROOT_UPLOADS = path.join(__dirname, '..', 'uploads');

['','skills','projects','certificates','internships','about','home','misc'].forEach(sub => {
  const d1 = path.join(UPLOADS_DIR, sub);
  const d2 = path.join(ROOT_UPLOADS, sub);
  if (!fs.existsSync(d1)) fs.mkdirSync(d1, { recursive: true });
  if (!fs.existsSync(d2)) fs.mkdirSync(d2, { recursive: true });
});

// Sync files between repo uploads/ and data/uploads/ on startup
function syncUploads() {
  function copyMissing(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyMissing(s, d);
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        if (!fs.existsSync(d)) {
          try { fs.copyFileSync(s, d); } catch (e) {}
        }
      }
    }
  }
  copyMissing(ROOT_UPLOADS, UPLOADS_DIR);
  copyMissing(UPLOADS_DIR, ROOT_UPLOADS);
}
try { syncUploads(); } catch (e) {}

// ── Serve uploaded files (check DATA_DIR/uploads, then repo/uploads) ──
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/uploads', express.static(ROOT_UPLOADS));

// ── Disable caching for API routes so dashboard updates reflect instantly ──
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));

// ── Serve admin login page ──
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'login.html'));
});

// ── Serve admin dashboard ──
app.get(['/admin', '/admin/dashboard'], (req, res) => {
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

