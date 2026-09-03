// server/backup.js — Automatic state backup, restore, and complete GitHub persistence (data + uploaded files)
const fs   = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'portfolio-state.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TABLES = [
  'site_settings',
  'home_content',
  'about_content',
  'contact_settings',
  'skills',
  'internships',
  'projects',
  'certificates',
  'education',
  'social_links',
  'navbar_items',
  'media',
  'messages'
];

/** Export all DB tables to a plain object */
function exportState(db) {
  const state = { version: 1, exported_at: new Date().toISOString(), data: {} };
  TABLES.forEach(tbl => {
    try {
      state.data[tbl] = db.prepare(`SELECT * FROM ${tbl}`).all();
    } catch (e) {
      console.warn(`[backup] Error reading table ${tbl}:`, e.message);
      state.data[tbl] = [];
    }
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
      try {
        db.prepare(`DELETE FROM ${tbl}`).run();
      } catch (e) {
        console.warn(`[backup] Could not clear table ${tbl}:`, e.message);
        return;
      }
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
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    if (!state || !state.data) return false;
    console.log('🔄 Restoring database from portfolio-state.json...');
    importState(db, state);
    console.log('✓ Database restored successfully from portfolio-state.json.');
    return true;
  } catch (err) {
    console.error('[backup] Restore error:', err.message);
    return false;
  }
}

/**
 * Helper to make authenticated GitHub REST API calls
 */
function githubRequest(token, method, apiPath, body) {
  return new Promise((resolve, reject) => {
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          const msg = (parsed && parsed.message) || `HTTP ${res.statusCode}`;
          reject(new Error(`${method} ${apiPath} returned ${res.statusCode}: ${msg}`));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/**
 * Recursively find all uploaded files in a directory
 */
function collectUploadFiles(dir, baseDir = dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectUploadFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.')) continue; // ignore .gitkeep, .DS_Store
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

/**
 * Commit portfolio-state.json AND all uploaded files in uploads/ to GitHub
 * using Git Trees & Blobs API so everything is permanently saved in one single commit.
 */
function publishToGitHub(db) {
  return new Promise(async (resolve) => {
    try {
      const token  = process.env.GITHUB_TOKEN;
      const owner  = process.env.GITHUB_OWNER  || 'Adityamullaguri';
      const repo   = process.env.GITHUB_REPO   || 'portfolio';
      const branch = process.env.GITHUB_BRANCH || 'main';

      if (!token) {
        return resolve({
          success: false,
          message: 'GITHUB_TOKEN is not set. Please add GITHUB_TOKEN in Render Dashboard -> Environment.'
        });
      }

      // 1. Export database state to portfolio-state.json
      autoSyncState(db);
      const stateContent = fs.readFileSync(STATE_FILE, 'utf8');

      // 2. Discover all uploaded files across all known upload locations
      const candidateDirs = [
        path.join(DATA_DIR, 'uploads'),
        path.join(__dirname, '..', 'uploads'),
        path.join(__dirname, '..', 'data', 'uploads')
      ];

      const fileMap = new Map(); // relPath -> fullPath
      for (const dir of candidateDirs) {
        const found = collectUploadFiles(dir, dir);
        for (const f of found) {
          if (!fileMap.has(f.relPath)) {
            fileMap.set(f.relPath, f.fullPath);
          }
        }
      }

      console.log(`[backup] Publishing to GitHub... Found ${fileMap.size} uploaded file(s) to commit.`);

      // 3. Fetch latest commit & base tree on target branch
      const branchRef = await githubRequest(token, 'GET', `/repos/${owner}/${repo}/commits/${branch}`);
      const commitSha = branchRef.sha;
      const baseTreeSha = branchRef.commit.tree.sha;

      const treeItems = [];

      // 4. Create blob for portfolio-state.json
      const stateBlob = await githubRequest(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
        content: Buffer.from(stateContent).toString('base64'),
        encoding: 'base64'
      });
      treeItems.push({
        path: 'data/portfolio-state.json',
        mode: '100644',
        type: 'blob',
        sha: stateBlob.sha
      });

      // 5. Create blobs for each uploaded file (images, PDFs, SVGs, etc.)
      let uploadedCount = 0;
      for (const [relPath, fullPath] of fileMap.entries()) {
        try {
          const buf = fs.readFileSync(fullPath);
          if (buf.length > 25 * 1024 * 1024) {
            console.warn(`[backup] Skipping ${relPath} (exceeds 25MB).`);
            continue;
          }
          const blob = await githubRequest(token, 'POST', `/repos/${owner}/${repo}/git/blobs`, {
            content: buf.toString('base64'),
            encoding: 'base64'
          });

          // Place in uploads/ and data/uploads/ so files are always available
          treeItems.push({
            path: `uploads/${relPath}`,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          });
          treeItems.push({
            path: `data/uploads/${relPath}`,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          });
          uploadedCount++;
        } catch (fileErr) {
          console.warn(`[backup] Error uploading blob for ${relPath}:`, fileErr.message);
        }
      }

      // 6. Create Git tree
      const newTree = await githubRequest(token, 'POST', `/repos/${owner}/${repo}/git/trees`, {
        base_tree: baseTreeSha,
        tree: treeItems
      });

      // 7. Create Commit
      const fileLabel = uploadedCount === 1 ? '1 file' : `${uploadedCount} files`;
      const newCommit = await githubRequest(token, 'POST', `/repos/${owner}/${repo}/git/commits`, {
        message: `chore: persist portfolio content and ${fileLabel} [${new Date().toISOString()}]`,
        tree: newTree.sha,
        parents: [commitSha]
      });

      // 8. Update branch ref
      await githubRequest(token, 'PATCH', `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        sha: newCommit.sha,
        force: true
      });

      console.log(`[backup] ✅ Published commit ${newCommit.sha.slice(0, 7)} with state and ${uploadedCount} file(s) to GitHub.`);
      return resolve({
        success: true,
        message: `Saved all content and ${uploadedCount} file(s) to GitHub! Render is redeploying with your changes permanently saved.`
      });

    } catch (err) {
      console.error('[backup] Publish to GitHub failed:', err);
      return resolve({ success: false, message: err.message });
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
