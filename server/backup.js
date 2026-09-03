// server/backup.js — Automatic state backup, restore, and GitHub-backed persistence
const fs   = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'portfolio-state.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TABLES = [
  'site_settings', 'home_content', 'about_content', 'contact_settings',
  'skills', 'internships', 'projects', 'certificates', 'education',
  'social_links', 'navbar_items'
];

/** Export all DB tables to a plain object */
function exportState(db) {
  const state = { version: 1, exported_at: new Date().toISOString(), data: {} };
  TABLES.forEach(tbl => {
    try   { state.data[tbl] = db.prepare(`SELECT * FROM ${tbl}`).all(); }
    catch (e) { console.warn(`[backup] Error reading ${tbl}:`, e.message); state.data[tbl] = []; }
  });
  return state;
}

/** Write current DB state to data/portfolio-state.json */
function autoSyncState(db) {
  try {
    ensureDataDir();
    const state = exportState(db);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[backup] Failed to auto-save state:', err.message);
    return false;
  }
}

/** Restore state JSON object into database */
function importState(db, state) {
  if (!state || !state.data) throw new Error('Invalid state data format.');

  db.transaction(() => {
    TABLES.forEach(tbl => {
      const rows = state.data[tbl];
      if (!Array.isArray(rows)) return;
      db.prepare(`DELETE FROM ${tbl}`).run();
      if (!rows.length) return;
      const cols = Object.keys(rows[0]);
      const stmt = db.prepare(
        `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      );
      rows.forEach(row => stmt.run(...cols.map(c => row[c])));
    });
  })();

  autoSyncState(db);
  return true;
}

/** Restore from data/portfolio-state.json on startup */
function restoreFromStateFile(db) {
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!state || !state.data) return false;
    console.log('🔄 Restoring database from portfolio-state.json...');
    importState(db, state);
    console.log('✓ Database restored successfully.');
    return true;
  } catch (err) {
    console.error('[backup] Restore error:', err.message);
    return false;
  }
}

/**
 * Commit portfolio-state.json to GitHub so data survives Render free-tier restarts.
 * Render re-deploys on every push, meaning the JSON is baked into the deployed files.
 * Returns a Promise<{success, message}>.
 */
function publishToGitHub(db) {
  return new Promise((resolve) => {
    try {
      const token  = process.env.GITHUB_TOKEN;
      const owner  = process.env.GITHUB_OWNER  || 'Adityamullaguri';
      const repo   = process.env.GITHUB_REPO   || 'portfolio';
      const branch = process.env.GITHUB_BRANCH || 'main';
      const filePath = 'data/portfolio-state.json';

      if (!token) {
        return resolve({ success: false, message: 'GITHUB_TOKEN env var not set.' });
      }

      // 1. Write the latest state to disk
      autoSyncState(db);
      const content = fs.readFileSync(STATE_FILE, 'utf8');
      const contentB64 = Buffer.from(content).toString('base64');

      // 2. Get the current file SHA (needed for GitHub update API)
      function ghRequest(method, apiPath, body, cb) {
        const bodyStr = body ? JSON.stringify(body) : '';
        const opts = {
          hostname: 'api.github.com',
          path: apiPath,
          method,
          headers: {
            'Authorization': `token ${token}`,
            'User-Agent':    'portfolio-cms/1.0',
            'Content-Type':  'application/json',
            'Accept':        'application/vnd.github.v3+json',
            ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
          }
        };
        const req = https.request(opts, res => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try { cb(null, res.statusCode, JSON.parse(data)); }
            catch (e) { cb(null, res.statusCode, data); }
          });
        });
        req.on('error', cb);
        if (bodyStr) req.write(bodyStr);
        req.end();
      }

      const apiFilePath = `/repos/${owner}/${repo}/contents/${filePath}`;

      ghRequest('GET', apiFilePath, null, (err, status, existing) => {
        if (err) return resolve({ success: false, message: `GitHub GET error: ${err.message}` });

        const sha = (status === 200 && existing && existing.sha) ? existing.sha : undefined;

        const payload = {
          message: `chore: persist portfolio data [${new Date().toISOString()}]`,
          content: contentB64,
          branch,
          ...(sha ? { sha } : {})
        };

        ghRequest('PUT', apiFilePath, payload, (err2, status2, result) => {
          if (err2) return resolve({ success: false, message: `GitHub PUT error: ${err2.message}` });
          if (status2 === 200 || status2 === 201) {
            console.log('[backup] ✅ portfolio-state.json committed to GitHub.');
            return resolve({ success: true, message: 'Data published to GitHub. Render will redeploy and your changes will be permanent.' });
          }
          const msg = (result && result.message) ? result.message : `HTTP ${status2}`;
          return resolve({ success: false, message: `GitHub error: ${msg}` });
        });
      });
    } catch (e) {
      resolve({ success: false, message: e.message });
    }
  });
}

module.exports = {
  exportState,
  autoSyncState,
  importState,
  restoreFromStateFile,
  publishToGitHub,
  STATE_FILE
};
