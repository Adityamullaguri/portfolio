// server/middleware/upload.js — Multer file upload configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// On Render: persistent disk is at /app/data. Store uploads there so
// they survive container restarts. DATA_DIR env var can override for local dev.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf'
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    let sub = req.query.folder || req.headers['x-upload-folder'] || 'misc';
    const url = req.originalUrl || '';
    if (url.includes('skills'))       sub = 'skills';
    else if (url.includes('projects')) sub = 'projects';
    else if (url.includes('cert'))     sub = 'certificates';
    else if (url.includes('intern'))   sub = 'internships';
    else if (url.includes('about'))    sub = 'about';
    else if (url.includes('home'))     sub = 'home';
    const allowedSubs = ['skills','projects','certificates','internships','about','home','misc'];
    if (!allowedSubs.includes(sub)) sub = 'misc';
    const dir = path.join(UPLOADS_DIR, sub);
    ensureDir(dir);
    req._uploadSubfolder = sub;
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-z0-9_\-]/gi, '-').toLowerCase().slice(0, 50);
    cb(null, `${base}-${Date.now()}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: PNG, JPG, WEBP, SVG, PDF`), false);
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = { upload, UPLOADS_DIR };

