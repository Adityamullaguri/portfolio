// server/routes/admin.js — Protected admin CRUD endpoints
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload, UPLOADS_DIR } = require('../middleware/upload');
const { exportState, autoSyncState, importState, publishToGitHub } = require('../backup');

// All routes require authentication
router.use(requireAuth);

function parseJSON(val, fallback = []) {
  try { return JSON.parse(val); } catch { return fallback; }
}

function log(db, action, entity, entity_id = '', detail = '') {
  try {
    db.prepare('INSERT INTO activity_log (action,entity,entity_id,detail) VALUES (?,?,?,?)')
      .run(action, entity, String(entity_id), detail);
  } catch(e) {}
  // Auto-persist database state to local JSON snapshot
  try { autoSyncState(db); } catch(e) {}
}

// ── BACKUP & RESTORE ──
router.get('/backup', (req, res) => {
  const db = getDb();
  const state = exportState(db);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="portfolio-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(state, null, 2));
});

router.post('/restore', (req, res) => {
  const db = getDb();
  try {
    const state = req.body;
    importState(db, state);
    log(db, 'RESTORE', 'system', 0, 'Restored database from JSON backup');
    res.json({ success: true, message: 'Database state restored successfully.' });
  } catch(err) {
    res.status(400).json({ error: 'Failed to restore state: ' + err.message });
  }
});

router.post('/sync-snapshot', (req, res) => {
  const db = getDb();
  const ok = autoSyncState(db);
  if (ok) res.json({ success: true, message: 'State synced to snapshot successfully.' });
  else res.status(500).json({ error: 'Failed to sync snapshot.' });
});

// ── PUBLISH TO GITHUB (permanent persistence) ──
router.post('/publish', async (req, res) => {
  const db = getDb();
  try {
    const result = await publishToGitHub(db);
    if (result.success) {
      log(db, 'PUBLISH', 'system', 0, 'Published state to GitHub');
      res.json({ success: true, message: result.message });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ── STATS (dashboard overview) ──
router.get('/stats', (req, res) => {
  const db = getDb();
  res.json({
    projects: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
    certificates: db.prepare('SELECT COUNT(*) as c FROM certificates').get().c,
    skills: db.prepare('SELECT COUNT(*) as c FROM skills').get().c,
    internships: db.prepare('SELECT COUNT(*) as c FROM internships').get().c,
    education: db.prepare('SELECT COUNT(*) as c FROM education').get().c,
    messages: db.prepare('SELECT COUNT(*) as c FROM messages WHERE read = 0').get().c,
    total_messages: db.prepare('SELECT COUNT(*) as c FROM messages').get().c,
    media: db.prepare('SELECT COUNT(*) as c FROM media').get().c
  });
});

// ── ACTIVITY LOG ──
router.get('/activity', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows);
});

// ── SITE SETTINGS ──
router.get('/settings', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM site_settings WHERE id = 1').get() || {});
});
router.put('/settings', (req, res) => {
  const db = getDb();
  const allowed = ['site_title','meta_desc','author','email','favicon_url','logo_url','copyright',
    'section_home','section_about','section_skills','section_internship','section_projects',
    'section_certificates','section_education','section_contact','accent_color'];
  const updates = {};
  allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields.' });
  updates.updated_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE site_settings SET ${sets} WHERE id = 1`).run(...Object.values(updates));
  log(db, 'UPDATE', 'settings', 1, 'Site settings updated');
  res.json({ success: true });
});

// ── HOME CONTENT ──
router.get('/home', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM home_content WHERE id = 1').get() || {};
  res.json({ ...row, chips: parseJSON(row.chips, []) });
});
router.put('/home', (req, res) => {
  const db = getDb();
  const allowed = ['greeting','name','role_line1','role_line2','description',
    'btn_primary_text','btn_primary_link','btn_secondary_text','btn_secondary_link',
    'hero_image_light','hero_image_dark','chips'];
  const updates = {};
  allowed.forEach(k => {
    if (k in req.body) {
      updates[k] = k === 'chips' ? JSON.stringify(req.body[k]) : req.body[k];
    }
  });
  updates.updated_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE home_content SET ${sets} WHERE id = 1`).run(...Object.values(updates));
  log(db, 'UPDATE', 'home', 1, 'Home content updated');
  res.json({ success: true });
});

// ── ABOUT CONTENT ──
router.get('/about', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM about_content WHERE id = 1').get() || {};
  res.json({ ...row, bio: parseJSON(row.bio, []), info_rows: parseJSON(row.info_rows, []) });
});
router.put('/about', (req, res) => {
  const db = getDb();
  const allowed = ['intro','bio','info_rows','image1_src','image1_alt','image1_caption','image2_src','image2_alt','image2_caption'];
  const updates = {};
  allowed.forEach(k => {
    if (k in req.body) {
      updates[k] = (k === 'bio' || k === 'info_rows') ? JSON.stringify(req.body[k]) : req.body[k];
    }
  });
  updates.updated_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE about_content SET ${sets} WHERE id = 1`).run(...Object.values(updates));
  log(db, 'UPDATE', 'about', 1, 'About content updated');
  res.json({ success: true });
});

// ── CONTACT SETTINGS ──
router.get('/contact', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM contact_settings WHERE id = 1').get() || {});
});
router.put('/contact', (req, res) => {
  const db = getDb();
  const allowed = ['email','phone','location','availability_text','contact_desc','form_title','form_enabled'];
  const updates = {};
  allowed.forEach(k => { if (k in req.body) updates[k] = req.body[k]; });
  updates.updated_at = new Date().toISOString();
  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE contact_settings SET ${sets} WHERE id = 1`).run(...Object.values(updates));
  log(db, 'UPDATE', 'contact', 1, 'Contact settings updated');
  res.json({ success: true });
});

// ── SKILLS ──
router.get('/skills', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM skills ORDER BY display_order ASC').all());
});
router.post('/skills', (req, res) => {
  const db = getDb();
  const { name, category='', logo_url='', description='', display_order=0, active=1 } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  const r = db.prepare('INSERT INTO skills (name,category,logo_url,description,display_order,active) VALUES (?,?,?,?,?,?)').run(name,category,logo_url,description,display_order,active?1:0);
  log(db, 'CREATE', 'skill', r.lastInsertRowid, `Added skill: ${name}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/skills/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body; // [{id, display_order}, ...]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE skills SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  log(db, 'REORDER', 'skills', '', 'Skills reordered');
  res.json({ success: true });
});
router.put('/skills/:id', (req, res) => {
  const db = getDb();
  const { name, category, logo_url, description, display_order, active } = req.body;
  const existing = db.prepare('SELECT id FROM skills WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Skill not found.' });
  db.prepare('UPDATE skills SET name=?,category=?,logo_url=?,description=?,display_order=?,active=?,updated_at=datetime("now") WHERE id=?')
    .run(name, category, logo_url, description, display_order, active?1:0, req.params.id);
  log(db, 'UPDATE', 'skill', req.params.id, `Updated skill: ${name}`);
  res.json({ success: true });
});
router.delete('/skills/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT name FROM skills WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Skill not found.' });
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'skill', req.params.id, `Deleted skill: ${existing.name}`);
  res.json({ success: true });
});

// ── INTERNSHIPS ──
router.get('/internships', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM internships ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, technologies:parseJSON(r.technologies,[]), responsibilities:parseJSON(r.responsibilities,[]), achievements:parseJSON(r.achievements,[]) })));
});
router.post('/internships', (req, res) => {
  const db = getDb();
  const { company, role, start_date='', end_date='', location='', description='', logo_url='', website_url='', technologies=[], responsibilities=[], achievements=[], cert_url='', cert_title='', display_order=0, active=1 } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'Company and role are required.' });
  const r = db.prepare('INSERT INTO internships (company,role,start_date,end_date,location,description,logo_url,website_url,technologies,responsibilities,achievements,cert_url,cert_title,display_order,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(company,role,start_date,end_date,location,description,logo_url,website_url,JSON.stringify(technologies),JSON.stringify(responsibilities),JSON.stringify(achievements),cert_url,cert_title,display_order,active?1:0);
  log(db, 'CREATE', 'internship', r.lastInsertRowid, `Added internship: ${role} at ${company}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/internships/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE internships SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  res.json({ success: true });
});
router.put('/internships/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM internships WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found.' });
  const { company, role, start_date, end_date, location, description, logo_url, website_url, technologies, responsibilities, achievements, cert_url, cert_title, display_order, active } = req.body;
  db.prepare('UPDATE internships SET company=?,role=?,start_date=?,end_date=?,location=?,description=?,logo_url=?,website_url=?,technologies=?,responsibilities=?,achievements=?,cert_url=?,cert_title=?,display_order=?,active=?,updated_at=datetime("now") WHERE id=?')
    .run(company,role,start_date,end_date,location,description,logo_url,website_url,JSON.stringify(technologies||[]),JSON.stringify(responsibilities||[]),JSON.stringify(achievements||[]),cert_url,cert_title,display_order,active?1:0,req.params.id);
  log(db, 'UPDATE', 'internship', req.params.id, `Updated internship: ${role} at ${company}`);
  res.json({ success: true });
});
router.delete('/internships/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT company,role FROM internships WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Internship not found.' });
  db.prepare('DELETE FROM internships WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'internship', req.params.id, `Deleted internship: ${existing.role} at ${existing.company}`);
  res.json({ success: true });
});

// ── PROJECTS ──
router.get('/projects', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, tags: parseJSON(r.tags, []) })));
});
router.post('/projects', (req, res) => {
  const db = getDb();
  const { name, short_desc='', full_desc='', category='', image_url='', github_url='#', demo_url='#', tags=[], role='', status='Completed', badge_label='Completed', featured=0, published=1, display_order=0 } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required.' });
  const r = db.prepare('INSERT INTO projects (name,short_desc,full_desc,category,image_url,github_url,demo_url,tags,role,status,badge_label,featured,published,display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(name,short_desc,full_desc,category,image_url,github_url,demo_url,JSON.stringify(tags),role,status,badge_label,featured?1:0,published?1:0,display_order);
  log(db, 'CREATE', 'project', r.lastInsertRowid, `Added project: ${name}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/projects/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE projects SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  log(db, 'REORDER', 'projects', '', 'Projects reordered');
  res.json({ success: true });
});
router.put('/projects/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });
  const { name, short_desc, full_desc, category, image_url, github_url, demo_url, tags, role, status, badge_label, featured, published, display_order } = req.body;
  db.prepare('UPDATE projects SET name=?,short_desc=?,full_desc=?,category=?,image_url=?,github_url=?,demo_url=?,tags=?,role=?,status=?,badge_label=?,featured=?,published=?,display_order=?,updated_at=datetime("now") WHERE id=?')
    .run(name,short_desc,full_desc,category,image_url,github_url,demo_url,JSON.stringify(tags||[]),role,status,badge_label,featured?1:0,published?1:0,display_order,req.params.id);
  log(db, 'UPDATE', 'project', req.params.id, `Updated project: ${name}`);
  res.json({ success: true });
});
router.delete('/projects/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT name FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'project', req.params.id, `Deleted project: ${existing.name}`);
  res.json({ success: true });
});

// ── CERTIFICATES ──
router.get('/certificates', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM certificates ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, skills_list: parseJSON(r.skills_list, []) })));
});
router.post('/certificates', (req, res) => {
  const db = getDb();
  const { cert_key, issuer, title, description='', year='', credential_id='', credential_url='', image_url='', category='Certification', skills_list=[], display_order=0, active=1 } = req.body;
  if (!issuer || !title) return res.status(400).json({ error: 'Issuer and title are required.' });
  const key = cert_key || title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const r = db.prepare('INSERT INTO certificates (cert_key,issuer,title,description,year,credential_id,credential_url,image_url,category,skills_list,display_order,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(key,issuer,title,description,year,credential_id,credential_url,image_url,category,JSON.stringify(skills_list),display_order,active?1:0);
  log(db, 'CREATE', 'certificate', r.lastInsertRowid, `Added certificate: ${title}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/certificates/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE certificates SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  log(db, 'REORDER', 'certificates', '', 'Certificates reordered');
  res.json({ success: true });
});
router.put('/certificates/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM certificates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Certificate not found.' });
  const { issuer, title, description, year, credential_id, credential_url, image_url, category, skills_list, display_order, active } = req.body;
  db.prepare('UPDATE certificates SET issuer=?,title=?,description=?,year=?,credential_id=?,credential_url=?,image_url=?,category=?,skills_list=?,display_order=?,active=?,updated_at=datetime("now") WHERE id=?')
    .run(issuer,title,description,year,credential_id,credential_url,image_url,category,JSON.stringify(skills_list||[]),display_order,active?1:0,req.params.id);
  log(db, 'UPDATE', 'certificate', req.params.id, `Updated certificate: ${title}`);
  res.json({ success: true });
});
router.delete('/certificates/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT title FROM certificates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Certificate not found.' });
  db.prepare('DELETE FROM certificates WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'certificate', req.params.id, `Deleted certificate: ${existing.title}`);
  res.json({ success: true });
});

// ── EDUCATION ──
router.get('/education', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM education ORDER BY display_order ASC').all();
  res.json(rows.map(r => ({ ...r, achievements: parseJSON(r.achievements, []) })));
});
router.post('/education', (req, res) => {
  const db = getDb();
  const { degree, institution, start_year='', end_year='', description='', location='', badge_text='', achievements=[], display_order=0, active=1 } = req.body;
  if (!degree || !institution) return res.status(400).json({ error: 'Degree and institution are required.' });
  const r = db.prepare('INSERT INTO education (degree,institution,start_year,end_year,description,location,badge_text,achievements,display_order,active) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(degree,institution,start_year,end_year,description,location,badge_text,JSON.stringify(achievements),display_order,active?1:0);
  log(db, 'CREATE', 'education', r.lastInsertRowid, `Added education: ${degree}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/education/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE education SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  res.json({ success: true });
});
router.put('/education/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM education WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Education entry not found.' });
  const { degree, institution, start_year, end_year, description, location, badge_text, achievements, display_order, active } = req.body;
  db.prepare('UPDATE education SET degree=?,institution=?,start_year=?,end_year=?,description=?,location=?,badge_text=?,achievements=?,display_order=?,active=?,updated_at=datetime("now") WHERE id=?')
    .run(degree,institution,start_year,end_year,description,location,badge_text,JSON.stringify(achievements||[]),display_order,active?1:0,req.params.id);
  log(db, 'UPDATE', 'education', req.params.id, `Updated education: ${degree}`);
  res.json({ success: true });
});
router.delete('/education/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT degree FROM education WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Education entry not found.' });
  db.prepare('DELETE FROM education WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'education', req.params.id, `Deleted education: ${existing.degree}`);
  res.json({ success: true });
});

// ── SOCIAL LINKS ──
router.get('/social-links', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM social_links ORDER BY display_order ASC').all());
});
router.post('/social-links', (req, res) => {
  const db = getDb();
  const { platform, url, icon_svg='', display_order=0, active=1 } = req.body;
  if (!platform || !url) return res.status(400).json({ error: 'Platform and URL are required.' });
  const r = db.prepare('INSERT INTO social_links (platform,url,icon_svg,display_order,active) VALUES (?,?,?,?,?)').run(platform,url,icon_svg,display_order,active?1:0);
  log(db, 'CREATE', 'social_link', r.lastInsertRowid, `Added social link: ${platform}`);
  res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/social-links/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE social_links SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  res.json({ success: true });
});
router.put('/social-links/:id', (req, res) => {
  const db = getDb();
  const { platform, url, icon_svg, display_order, active } = req.body;
  const existing = db.prepare('SELECT id FROM social_links WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Social link not found.' });
  db.prepare('UPDATE social_links SET platform=?,url=?,icon_svg=?,display_order=?,active=? WHERE id=?').run(platform,url,icon_svg,display_order,active?1:0,req.params.id);
  log(db, 'UPDATE', 'social_link', req.params.id, `Updated social link: ${platform}`);
  res.json({ success: true });
});
router.delete('/social-links/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT platform FROM social_links WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Social link not found.' });
  db.prepare('DELETE FROM social_links WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'social_link', req.params.id, `Deleted social link: ${existing.platform}`);
  res.json({ success: true });
});

// ── NAVBAR ──
router.get('/navbar', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM navbar_items ORDER BY display_order ASC').all());
});
router.put('/navbar/reorder', (req, res) => {
  const db = getDb();
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required.' });
  const upd = db.prepare('UPDATE navbar_items SET display_order = ? WHERE id = ?');
  db.transaction(() => order.forEach(item => upd.run(item.display_order, item.id)))();
  log(db, 'REORDER', 'navbar', '', 'Navbar reordered');
  res.json({ success: true });
});
router.put('/navbar/:id', (req, res) => {
  const db = getDb();
  const { label, section_id, display_order, visible } = req.body;
  db.prepare('UPDATE navbar_items SET label=?,section_id=?,display_order=?,visible=? WHERE id=?').run(label,section_id,display_order,visible?1:0,req.params.id);
  log(db, 'UPDATE', 'navbar', req.params.id, `Updated nav item: ${label}`);
  res.json({ success: true });
});

// ── MESSAGES ──
router.get('/messages', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC').all();
  res.json(rows);
});
router.put('/messages/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
router.put('/messages/:id/unread', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE messages SET read = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
router.delete('/messages/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM messages WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Message not found.' });
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'message', req.params.id, 'Deleted message');
  res.json({ success: true });
});

// ── MEDIA ──
router.get('/media', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM media ORDER BY upload_date DESC').all());
});
router.post('/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const db = getDb();
  const fileUrl = `/uploads/${req._uploadSubfolder}/${req.file.filename}`;
  const r = db.prepare('INSERT INTO media (filename,original_name,mimetype,size_bytes,url,subfolder) VALUES (?,?,?,?,?,?)')
    .run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, fileUrl, req._uploadSubfolder || 'misc');
  log(db, 'UPLOAD', 'media', r.lastInsertRowid, `Uploaded: ${req.file.originalname}`);
  res.json({ success: true, id: r.lastInsertRowid, url: fileUrl, filename: req.file.filename, original_name: req.file.originalname, mimetype: req.file.mimetype, size_bytes: req.file.size });
});
router.delete('/media/:id', (req, res) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Media not found.' });
  const filePath = path.join(UPLOADS_DIR, item.subfolder, item.filename);
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch(e) {}
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  log(db, 'DELETE', 'media', req.params.id, `Deleted media: ${item.original_name}`);
  res.json({ success: true });
});

// ── ADMIN SEARCH ──
router.get('/search', (req, res) => {
  const db = getDb();
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json({ results: [] });
  const like = `%${q}%`;
  const results = [
    ...db.prepare("SELECT id,'project' as type,name as title FROM projects WHERE lower(name) LIKE ? OR lower(short_desc) LIKE ? OR lower(tags) LIKE ? LIMIT 5").all(like,like,like).map(r => ({...r})),
    ...db.prepare("SELECT id,'certificate' as type,title FROM certificates WHERE lower(title) LIKE ? OR lower(issuer) LIKE ? LIMIT 5").all(like,like).map(r => ({...r})),
    ...db.prepare("SELECT id,'skill' as type,name as title FROM skills WHERE lower(name) LIKE ? OR lower(category) LIKE ? LIMIT 5").all(like,like).map(r => ({...r})),
    ...db.prepare("SELECT id,'internship' as type,(company||' — '||role) as title FROM internships WHERE lower(company) LIKE ? OR lower(role) LIKE ? LIMIT 5").all(like,like).map(r => ({...r})),
    ...db.prepare("SELECT id,'education' as type,degree as title FROM education WHERE lower(degree) LIKE ? OR lower(institution) LIKE ? LIMIT 5").all(like,like).map(r => ({...r})),
    ...db.prepare("SELECT id,'message' as type,(name||' <'||email||'>') as title FROM messages WHERE lower(name) LIKE ? OR lower(message) LIKE ? LIMIT 5").all(like,like).map(r => ({...r}))
  ];
  res.json({ results });
});

module.exports = router;

