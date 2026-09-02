// server/backup.js — Automatic state backup, restore, and JSON sync
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'portfolio-state.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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
  'navbar_items'
];

/**
 * Export all database state to a single JSON object
 */
function exportState(db) {
  const state = {
    version: 1,
    exported_at: new Date().toISOString(),
    data: {}
  };

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

/**
 * Save current state to data/portfolio-state.json
 */
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

/**
 * Restore state from JSON into database
 */
function importState(db, state) {
  if (!state || !state.data) throw new Error('Invalid state data format.');

  const restoreTransaction = db.transaction(() => {
    TABLES.forEach(tbl => {
      const rows = state.data[tbl];
      if (!Array.isArray(rows)) return;

      // Clear existing table rows
      db.prepare(`DELETE FROM ${tbl}`).run();

      if (rows.length === 0) return;

      // Insert all rows
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);

      rows.forEach(row => {
        const values = cols.map(c => row[c]);
        stmt.run(...values);
      });
    });
  });

  restoreTransaction();
  autoSyncState(db);
  return true;
}

/**
 * Check and restore from data/portfolio-state.json on startup
 */
function restoreFromStateFile(db) {
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    if (!state || !state.data) return false;

    console.log('🔄 Restoring database from persistent portfolio-state.json...');
    importState(db, state);
    console.log('✓ Successfully restored database state.');
    return true;
  } catch (err) {
    console.error('[backup] Error restoring from state file:', err.message);
    return false;
  }
}

module.exports = {
  exportState,
  autoSyncState,
  importState,
  restoreFromStateFile,
  STATE_FILE
};

