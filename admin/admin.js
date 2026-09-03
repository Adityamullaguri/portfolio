/**
 * admin.js — Complete Admin Dashboard SPA
 * Handles: routing, auth check, all CRUD pages, search, modals, toasts
 */

(function () {
'use strict';

// ── Theme ──
const html = document.documentElement;
const savedTheme = localStorage.getItem('admin-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('admin-theme', next);
  });
}

// ── API Helper ──
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth Check ──
async function checkAuth() {
  try {
    await api('GET', '/api/auth/me');
  } catch {
    window.location.href = '/admin/login';
  }
}

// ── Toast ──
const toastContainer = document.getElementById('toastContainer');
function toast(msg, type = 'success', duration = 3500) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  t.innerHTML = `<span style="font-size:15px">${icon}</span><span>${msg}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideIn .25s reverse'; setTimeout(() => t.remove(), 250); }, duration);
}

// ── Publish Changes to GitHub (permanent persistence) ──
const publishBtn    = document.getElementById('publishBtn');
const publishStatus = document.getElementById('publishStatus');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';
    if (publishStatus) publishStatus.textContent = '';
    try {
      await api('POST', '/api/admin/publish');
      toast('✅ Published to GitHub! Render is redeploying — your changes are now permanent.', 'success', 6000);
      if (publishStatus) publishStatus.textContent = `Last published: ${new Date().toLocaleTimeString()}`;
    } catch (err) {
      toast('Publish failed: ' + err.message, 'error', 5000);
      if (publishStatus) publishStatus.textContent = 'Failed — check GITHUB_TOKEN in Render env vars.';
    } finally {
      publishBtn.disabled = false;
      publishBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Publish Changes`;
    }
  });
}

// ── Confirm Modal ──
let _confirmResolve = null;
const confirmModal = document.getElementById('confirmModal');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmCancel = document.getElementById('confirmCancel');

function confirm(title, msg, warning, okLabel = 'Delete', danger = true) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = msg;
  const warnEl = document.getElementById('confirmWarning');
  if (warning) { warnEl.textContent = warning; warnEl.style.display = ''; }
  else warnEl.style.display = 'none';
  confirmOkBtn.textContent = okLabel;
  confirmOkBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  confirmModal.classList.add('active');
  return new Promise(resolve => { _confirmResolve = resolve; });
}
function closeConfirm(result) {
  confirmModal.classList.remove('active');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}
confirmOkBtn.addEventListener('click', () => closeConfirm(true));
confirmCancelBtn.addEventListener('click', () => closeConfirm(false));
confirmCancel.addEventListener('click', () => closeConfirm(false));
confirmModal.addEventListener('click', e => { if (e.target === confirmModal) closeConfirm(false); });

// ── Form Modal ──
const formModal = document.getElementById('formModal');
const formModalBody = document.getElementById('formModalBody');
const formModalClose = document.getElementById('formModalClose');
const formModalCancel = document.getElementById('formModalCancel');
const formModalSave = document.getElementById('formModalSave');
let _formSaveHandler = null;

function openFormModal(title, bodyHTML, onSave) {
  document.getElementById('formModalTitle').textContent = title;
  formModalBody.innerHTML = bodyHTML;
  _formSaveHandler = onSave;
  formModal.classList.add('active');
  // Focus first input
  setTimeout(() => { const inp = formModalBody.querySelector('input,textarea,select'); if (inp) inp.focus(); }, 100);
}
function closeFormModal() { formModal.classList.remove('active'); formModalBody.innerHTML = ''; _formSaveHandler = null; }
formModalClose.addEventListener('click', closeFormModal);
formModalCancel.addEventListener('click', closeFormModal);
formModal.addEventListener('click', e => { if (e.target === formModal) closeFormModal(); });
formModalSave.addEventListener('click', async () => {
  if (!_formSaveHandler) return;
  formModalSave.disabled = true;
  formModalSave.innerHTML = '<span style="font-size:12px">Saving…</span>';
  try {
    await _formSaveHandler();
  } catch(e) {
    toast(e.message, 'error');
  } finally {
    formModalSave.disabled = false;
    formModalSave.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes';
  }
});

// ── Image / File Uploader Helper ──
window.updateImageFieldPreview = function(id) {
  const input = document.getElementById(id);
  const preview = document.getElementById(id + '_preview');
  if (!input || !preview) return;
  const val = input.value.trim();
  if (!val) { preview.innerHTML = ''; return; }
  const isDoc = val.endsWith('.pdf');
  if (isDoc) {
    preview.innerHTML = `<a href="${esc(val)}" target="_blank" class="btn btn-secondary btn-sm" style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;">📄 View Document (${esc(val.split('/').pop())})</a>`;
  } else {
    preview.innerHTML = `<div class="img-preview-box" style="margin-top:6px;display:flex;align-items:center;gap:10px;">
      <img src="${esc(val)}" style="max-height:48px;max-width:120px;border-radius:6px;border:1px solid var(--br2);background:var(--sf3);object-fit:contain;padding:2px;" onerror="this.parentElement.style.display='none'">
      <span style="font-size:11px;color:var(--lo);">${esc(val)}</span>
    </div>`;
  }
};

function makeImageUploadField({ id, label, value = '', folder = 'misc', accept = 'image/png,image/jpeg,image/webp,image/svg+xml,application/pdf', placeholder = 'URL or click Upload' }) {
  const isDoc = value && value.endsWith('.pdf');
  const previewHtml = value ? (isDoc ? `<a href="${esc(value)}" target="_blank" class="btn btn-secondary btn-sm" style="margin-top:6px;display:inline-flex;align-items:center;gap:4px;">📄 View Document (${esc(value.split('/').pop())})</a>` : `<div class="img-preview-box" style="margin-top:6px;display:flex;align-items:center;gap:10px;">
    <img src="${esc(value)}" style="max-height:48px;max-width:120px;border-radius:6px;border:1px solid var(--br2);background:var(--sf3);object-fit:contain;padding:2px;" onerror="this.parentElement.style.display='none'">
    <span style="font-size:11px;color:var(--lo);">${esc(value)}</span>
  </div>`) : '';

  return `
    <div class="form-group img-upload-group" data-target="${id}">
      <label class="form-label">${label}</label>
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="form-input" id="${id}" value="${esc(value)}" placeholder="${esc(placeholder)}" style="flex:1;" oninput="updateImageFieldPreview('${id}')">
        <label class="btn btn-secondary" style="cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;font-size:12px;user-select:none;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
          <input type="file" class="direct-file-uploader" data-target="${id}" data-folder="${folder}" accept="${accept}" style="display:none">
        </label>
      </div>
      <div id="${id}_preview">${previewHtml}</div>
    </div>
  `;
}

// Global delegated change listener for direct file upload inputs
document.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('direct-file-uploader')) return;
  const file = e.target.files[0];
  if (!file) return;
  const targetId = e.target.dataset.target;
  const folder = e.target.dataset.folder || 'misc';
  const fd = new FormData();
  fd.append('file', file);

  const uploadLabel = e.target.closest('label');
  const origHtml = uploadLabel ? uploadLabel.innerHTML : '';
  if (uploadLabel) {
    uploadLabel.innerHTML = `<span style="font-size:11px;color:var(--ac);">Uploading…</span>`;
    uploadLabel.style.pointerEvents = 'none';
  }

  try {
    const res = await fetch(`/api/admin/media/upload?folder=${folder}`, {
      method: 'POST',
      body: fd,
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    const input = document.getElementById(targetId);
    if (input) {
      input.value = data.url;
      window.updateImageFieldPreview(targetId);
    }
    toast(`Uploaded: ${file.name}`);
  } catch (err) {
    toast(`Upload failed: ${err.message}`, 'error');
  } finally {
    if (uploadLabel) {
      uploadLabel.innerHTML = origHtml;
      uploadLabel.style.pointerEvents = '';
    }
  }
});

// ── Content Area ──
const content = document.getElementById('adminContent');
const pageTitle = document.getElementById('pageTitle');
const PAGE_TITLES = {
  dashboard:'Dashboard', home:'Home', about:'About', skills:'Skills',
  internships:'Internships', projects:'Projects', certificates:'Certificates',
  education:'Education', contact:'Contact', navbar:'Navigation',
  social:'Social Links', media:'Media Library', settings:'Site Settings',
  messages:'Messages', activity:'Activity Log', appearance:'Appearance'
};

// ── Router ──
let currentPage = null;
function navigate(page) {
  if (currentPage === page) return;
  currentPage = page;
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  pageTitle.textContent = PAGE_TITLES[page] || page;
  content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:var(--lo)"><div class="spinner" style="width:24px;height:24px;border:2px solid var(--br2);border-top-color:var(--ac);border-radius:50%;animation:spin .7s linear infinite"></div></div>';
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('active');
  // Render page
  const renders = {
    dashboard: renderDashboard, home: renderHome, about: renderAbout,
    skills: renderSkills, internships: renderInternships, projects: renderProjects,
    certificates: renderCertificates, education: renderEducation, contact: renderContact,
    navbar: renderNavbar, social: renderSocial, media: renderMedia,
    settings: renderSettings, messages: renderMessages, activity: renderActivity,
    appearance: renderAppearance
  };
  const fn = renders[page];
  if (fn) fn().catch(err => {
    content.innerHTML = `<div class="empty-state"><h3>Error loading page</h3><p>${err.message}</p><button class="btn btn-secondary" onclick="navigate('${page}')">Retry</button></div>`;
  });
}

// ── Sidebar click ──
document.querySelectorAll('.sidebar-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ── Mobile sidebar toggle ──
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
sidebarToggle.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  sidebarBackdrop.classList.toggle('active');
});
sidebarBackdrop.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  sidebarBackdrop.classList.remove('active');
});

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('POST', '/api/auth/logout').catch(() => {});
  window.location.href = '/admin/login';
});

// ── Global Search ──
const searchInput = document.getElementById('globalSearch');
const searchResults = document.getElementById('searchResults');
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { searchResults.style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    try {
      const data = await api('GET', `/api/admin/search?q=${encodeURIComponent(q)}`);
      if (!data.results.length) {
        searchResults.innerHTML = '<div style="padding:12px;text-align:center;color:var(--lo);font-size:13px">No results found</div>';
      } else {
        searchResults.innerHTML = data.results.map(r =>
          `<div class="search-result-item" data-type="${r.type}" onclick="navigate('${r.type==='message'?'messages':r.type+'s'}');searchResults.style.display='none';searchInput.value=''">
            <span class="badge-inactive" style="font-size:10px;padding:2px 6px;border-radius:4px;flex-shrink:0">${r.type}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title}</span>
          </div>`).join('');
      }
      searchResults.style.display = 'block';
    } catch {}
  }, 300);
});
document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-search-wrap')) searchResults.style.display = 'none';
});

// ──────────────────────────────────────────────────────────
// PAGE RENDERERS
// ──────────────────────────────────────────────────────────

// ── DASHBOARD ──
async function renderDashboard() {
  const stats = await api('GET', '/api/admin/stats');
  const activity = await api('GET', '/api/admin/activity');

  // Update message badge
  const badge = document.getElementById('msgBadge');
  if (badge) { badge.textContent = stats.messages; badge.style.display = stats.messages > 0 ? '' : 'none'; }

  const statItems = [
    { label:'Projects', num: stats.projects, icon:'<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>', page:'projects' },
    { label:'Certificates', num: stats.certificates, icon:'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>', page:'certificates' },
    { label:'Skills', num: stats.skills, icon:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', page:'skills' },
    { label:'Internships', num: stats.internships, icon:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>', page:'internships' },
    { label:'Education', num: stats.education, icon:'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/>', page:'education' },
    { label:'Messages', num: stats.total_messages, icon:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>', page:'messages', unread: stats.messages }
  ];

  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd" style="margin-bottom:20px;">
        <div><h2>Good to see you! 👋</h2><p>Here's an overview of your portfolio content.</p></div>
      </div>

      <div class="stats-grid" style="margin-bottom:28px;">
        ${statItems.map(s => `
          <div class="stat-card card" style="cursor:pointer" onclick="navigate('${s.page}')">
            <div class="stat-icon"><svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--ac)" fill="none" stroke-width="2" stroke-linecap="round">${s.icon}</svg></div>
            <div class="stat-num">${s.num}</div>
            <div class="stat-label">${s.label}${s.unread ? `<span style="color:var(--ac);margin-left:4px">(${s.unread} unread)</span>` : ''}</div>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" class="dash-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Quick Actions</span>
          </div>
          <div class="quick-actions">
            <button class="btn btn-primary btn-sm" onclick="navigate('projects');setTimeout(()=>document.getElementById('addBtn')?.click(),400)">+ Add Project</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('certificates');setTimeout(()=>document.getElementById('addBtn')?.click(),400)">+ Add Certificate</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('skills');setTimeout(()=>document.getElementById('addBtn')?.click(),400)">+ Add Skill</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('internships');setTimeout(()=>document.getElementById('addBtn')?.click(),400)">+ Add Internship</button>
            <button class="btn btn-secondary btn-sm" onclick="navigate('education');setTimeout(()=>document.getElementById('addBtn')?.click(),400)">+ Add Education</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Activity</span>
            <button class="btn btn-secondary btn-sm" onclick="navigate('activity')">View all</button>
          </div>
          <div>
            ${activity.slice(0,5).map(a => `
              <div class="activity-item">
                <div class="activity-dot"></div>
                <div>
                  <div class="activity-text"><strong>${a.action}</strong> ${a.entity} ${a.detail ? '— '+a.detail : ''}</div>
                  <div class="activity-time">${new Date(a.created_at).toLocaleString()}</div>
                </div>
              </div>`).join('') || '<p style="color:var(--lo);font-size:13px;padding:8px 0">No activity yet.</p>'}
          </div>
        </div>
      </div>
    </div>`;
}

// ── HOME PAGE EDITOR ──
async function renderHome() {
  const data = await api('GET', '/api/admin/home');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Home Page</h2><p>Edit hero section content</p></div>
        <button class="btn btn-primary" id="saveHomeBtn">Save Changes</button>
      </div>
      <div class="card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Greeting Text</label>
            <input class="form-input" id="h_greeting" value="${esc(data.greeting)}">
          </div>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" id="h_name" value="${esc(data.name)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Role Line 1</label>
            <input class="form-input" id="h_role1" value="${esc(data.role_line1)}">
          </div>
          <div class="form-group">
            <label class="form-label">Role Line 2</label>
            <input class="form-input" id="h_role2" value="${esc(data.role_line2)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input" id="h_desc" rows="3">${esc(data.description)}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Primary Button Text</label>
            <input class="form-input" id="h_btn1t" value="${esc(data.btn_primary_text)}">
          </div>
          <div class="form-group">
            <label class="form-label">Primary Button Link</label>
            <input class="form-input" id="h_btn1l" value="${esc(data.btn_primary_link)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Secondary Button Text</label>
            <input class="form-input" id="h_btn2t" value="${esc(data.btn_secondary_text)}">
          </div>
          <div class="form-group">
            <label class="form-label">Secondary Button Link</label>
            <input class="form-input" id="h_btn2l" value="${esc(data.btn_secondary_link)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Skill Chips (comma-separated)</label>
          <input class="form-input" id="h_chips" value="${esc((data.chips||[]).join(', '))}">
          <div style="font-size:11px;color:var(--lo);margin-top:4px">e.g. React, Python, Node.js, AI / ML, IoT</div>
        </div>
        <div class="form-row">
          ${makeImageUploadField({ id: 'h_imgL', label: 'Hero Image (Light Mode)', value: data.hero_image_light||'portrait.png', folder: 'home', placeholder: 'portrait.png or /uploads/home/...' })}
          ${makeImageUploadField({ id: 'h_imgD', label: 'Hero Image (Dark Mode)', value: data.hero_image_dark||'portrait-dark.png', folder: 'home', placeholder: 'portrait-dark.png or /uploads/home/...' })}
        </div>
      </div>
    </div>`;

  document.getElementById('saveHomeBtn').addEventListener('click', async () => {
    try {
      await api('PUT', '/api/admin/home', {
        greeting: v('h_greeting'), name: v('h_name'),
        role_line1: v('h_role1'), role_line2: v('h_role2'),
        description: v('h_desc'),
        btn_primary_text: v('h_btn1t'), btn_primary_link: v('h_btn1l'),
        btn_secondary_text: v('h_btn2t'), btn_secondary_link: v('h_btn2l'),
        chips: v('h_chips').split(',').map(s => s.trim()).filter(Boolean),
        hero_image_light: v('h_imgL'), hero_image_dark: v('h_imgD')
      });
      toast('Home page updated!');
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── ABOUT EDITOR ──
async function renderAbout() {
  const data = await api('GET', '/api/admin/about');
  const bio = data.bio || [];
  const rows = data.info_rows || [];

  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>About</h2><p>Edit About section content</p></div>
        <button class="btn btn-primary" id="saveAboutBtn">Save Changes</button>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">Introduction</span></div>
        <div class="form-group">
          <label class="form-label">Intro Text (HTML allowed for highlights)</label>
          <textarea class="form-input" id="ab_intro" rows="2">${esc(data.intro||'')}</textarea>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">Bio Paragraphs</span>
          <button class="btn btn-secondary btn-sm" id="addBioBtn">+ Add Paragraph</button>
        </div>
        <div id="bioParagraphs">
          ${bio.map((p,i) => `
            <div class="bio-para-row" style="display:flex;gap:10px;margin-bottom:10px;" data-idx="${i}">
              <textarea class="form-input" rows="2" style="flex:1">${esc(p)}</textarea>
              <button class="btn-icon" onclick="this.closest('.bio-para-row').remove()">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>`).join('')}
        </div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">Info Rows</span>
          <button class="btn btn-secondary btn-sm" id="addInfoRowBtn">+ Add Row</button>
        </div>
        <div id="infoRows">
          ${rows.map((r,i) => `
            <div class="info-row-entry" style="display:grid;grid-template-columns:1fr 2fr auto;gap:10px;margin-bottom:10px;" data-idx="${i}">
              <input class="form-input" placeholder="Label" value="${esc(r.label)}">
              <input class="form-input" placeholder="Value" value="${esc(r.value)}">
              <button class="btn-icon" onclick="this.closest('.info-row-entry').remove()">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">About Images</span></div>
        <div class="form-row">
          <div>
            ${makeImageUploadField({ id: 'ab_img1', label: 'Image 1 Source', value: data.image1_src||'about-workspace.jpg', folder: 'about', placeholder: 'about-workspace.jpg or upload' })}
            <div class="form-group" style="margin-top:8px">
              <label class="form-label">Caption</label>
              <input class="form-input" id="ab_cap1" value="${esc(data.image1_caption||'')}">
            </div>
          </div>
          <div>
            ${makeImageUploadField({ id: 'ab_img2', label: 'Image 2 Source', value: data.image2_src||'about-dataviz.jpg', folder: 'about', placeholder: 'about-dataviz.jpg or upload' })}
            <div class="form-group" style="margin-top:8px">
              <label class="form-label">Caption</label>
              <input class="form-input" id="ab_cap2" value="${esc(data.image2_caption||'')}">
            </div>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('addBioBtn').addEventListener('click', () => {
    const d = document.createElement('div');
    d.className = 'bio-para-row';
    d.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;';
    d.innerHTML = `<textarea class="form-input" rows="2" style="flex:1" placeholder="New paragraph…"></textarea><button class="btn-icon" onclick="this.closest('.bio-para-row').remove()"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`;
    document.getElementById('bioParagraphs').appendChild(d);
  });

  document.getElementById('addInfoRowBtn').addEventListener('click', () => {
    const d = document.createElement('div');
    d.className = 'info-row-entry';
    d.style.cssText = 'display:grid;grid-template-columns:1fr 2fr auto;gap:10px;margin-bottom:10px;';
    d.innerHTML = `<input class="form-input" placeholder="Label"><input class="form-input" placeholder="Value"><button class="btn-icon" onclick="this.closest('.info-row-entry').remove()"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`;
    document.getElementById('infoRows').appendChild(d);
  });

  document.getElementById('saveAboutBtn').addEventListener('click', async () => {
    try {
      const bioParas = [...document.querySelectorAll('.bio-para-row textarea')].map(t => t.value.trim()).filter(Boolean);
      const infoRowsData = [...document.querySelectorAll('.info-row-entry')].map(row => {
        const inputs = row.querySelectorAll('input');
        return { label: inputs[0].value.trim(), value: inputs[1].value.trim() };
      }).filter(r => r.label && r.value);
      await api('PUT', '/api/admin/about', {
        intro: v('ab_intro'), bio: bioParas, info_rows: infoRowsData,
        image1_src: v('ab_img1'), image1_caption: v('ab_cap1'),
        image2_src: v('ab_img2'), image2_caption: v('ab_cap2')
      });
      toast('About updated!');
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── SKILLS ──
async function renderSkills() {
  const data = await api('GET', '/api/admin/skills');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Skills</h2><p>${data.length} skills</p></div>
        <button class="btn btn-primary" id="addBtn">+ Add Skill</button>
      </div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No skills yet</h3><p>Add your first skill.</p></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Category</th><th>Logo URL</th><th>Description</th><th>Order</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            ${data.map(s => `<tr>
              <td><div style="display:flex;align-items:center;gap:8px;">${s.logo_url ? `<img src="${esc(s.logo_url)}" style="width:20px;height:20px;object-fit:contain;">` : ''}<strong>${esc(s.name)}</strong></div></td>
              <td><span class="tag-chip">${esc(s.category)}</span></td>
              <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--lo)">${esc(s.logo_url)}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.description)}</td>
              <td>${s.display_order}</td>
              <td><span class="${s.active ? 'badge-active' : 'badge-inactive'}">${s.active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-secondary btn-sm edit-skill" data-id="${s.id}">Edit</button>
                  <button class="btn btn-danger btn-sm del-skill" data-id="${s.id}" data-name="${esc(s.name)}">Delete</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>
    </div>`;

  document.getElementById('addBtn').addEventListener('click', () => openSkillModal(null));
  document.querySelectorAll('.edit-skill').forEach(btn => {
    btn.addEventListener('click', () => { const s = data.find(d => d.id == btn.dataset.id); openSkillModal(s); });
  });
  document.querySelectorAll('.del-skill').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('skill', btn.dataset.id, btn.dataset.name, '/api/admin/skills/', renderSkills));
  });
}

function openSkillModal(skill) {
  const isNew = !skill;
  openFormModal(isNew ? 'Add Skill' : 'Edit Skill', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="sk_name" value="${esc(skill?.name||'')}"></div>
      <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="sk_cat" value="${esc(skill?.category||'')}"></div>
    </div>
    ${makeImageUploadField({ id: 'sk_logo', label: 'Skill Logo (SVG / PNG / WebP)', value: skill?.logo_url||'', folder: 'skills', placeholder: 'assets/skills/react.svg or upload' })}
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="sk_desc" rows="2">${esc(skill?.description||'')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="sk_order" value="${skill?.display_order??0}"></div>
      <div class="form-group"><label class="form-label">Active</label>
        <label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="sk_active" ${(skill?.active??1) ? 'checked' : ''}><span>Active</span></label>
      </div>
    </div>`, async () => {
    const body = { name: v('sk_name'), category: v('sk_cat'), logo_url: v('sk_logo'), description: v('sk_desc'), display_order: +v('sk_order'), active: document.getElementById('sk_active').checked };
    if (!body.name) throw new Error('Name is required');
    if (isNew) { await api('POST', '/api/admin/skills', body); toast('Skill added!'); }
    else { await api('PUT', `/api/admin/skills/${skill.id}`, body); toast('Skill updated!'); }
    closeFormModal(); renderSkills();
  });
}

// ── INTERNSHIPS ──
async function renderInternships() {
  const data = await api('GET', '/api/admin/internships');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Internships</h2><p>${data.length} entries</p></div>
        <button class="btn btn-primary" id="addBtn">+ Add Internship</button>
      </div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No internships yet</h3></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Company</th><th>Role</th><th>Period</th><th>Location</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${data.map(i => `<tr>
            <td><div style="display:flex;align-items:center;gap:8px;">${i.logo_url ? `<img src="${esc(i.logo_url)}" style="width:24px;height:24px;object-fit:contain;">` : ''}<strong>${esc(i.company)}</strong></div></td>
            <td>${esc(i.role)}</td>
            <td style="font-size:12px;color:var(--lo)">${esc(i.start_date)} – ${esc(i.end_date)}</td>
            <td>${esc(i.location)}</td>
            <td><span class="${i.active ? 'badge-active' : 'badge-inactive'}">${i.active ? 'Active' : 'Inactive'}</span></td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm edit-int" data-id="${i.id}">Edit</button>
              <button class="btn btn-danger btn-sm del-int" data-id="${i.id}" data-name="${esc(i.company)}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;
  document.getElementById('addBtn').addEventListener('click', () => openInternshipModal(null));
  document.querySelectorAll('.edit-int').forEach(btn => {
    btn.addEventListener('click', () => openInternshipModal(data.find(d => d.id == btn.dataset.id)));
  });
  document.querySelectorAll('.del-int').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('internship', btn.dataset.id, btn.dataset.name, '/api/admin/internships/', renderInternships));
  });
}

function openInternshipModal(item) {
  const isNew = !item;
  openFormModal(isNew ? 'Add Internship' : 'Edit Internship', `
    <div class="form-row"><div class="form-group"><label class="form-label">Company *</label><input class="form-input" id="in_co" value="${esc(item?.company||'')}"></div><div class="form-group"><label class="form-label">Role *</label><input class="form-input" id="in_role" value="${esc(item?.role||'')}"></div></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="in_sd" value="${esc(item?.start_date||'')}"></div><div class="form-group"><label class="form-label">End Date</label><input class="form-input" id="in_ed" value="${esc(item?.end_date||'')}"></div></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Location</label><input class="form-input" id="in_loc" value="${esc(item?.location||'')}"></div>
      ${makeImageUploadField({ id: 'in_logo', label: 'Company Logo', value: item?.logo_url||'', folder: 'internships', placeholder: 'assets/techcorp.svg or upload' })}
    </div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="in_desc" rows="3">${esc(item?.description||'')}</textarea></div>
    <div class="form-group"><label class="form-label">Technologies (comma-separated)</label><input class="form-input" id="in_tech" value="${esc((item?.technologies||[]).join(', '))}"></div>
    <div class="form-group"><label class="form-label">Responsibilities (one per line)</label><textarea class="form-input" id="in_resp" rows="3">${esc((item?.responsibilities||[]).join('\n'))}</textarea></div>
    <div class="form-group"><label class="form-label">Achievements (one per line)</label><textarea class="form-input" id="in_ach" rows="2">${esc((item?.achievements||[]).join('\n'))}</textarea></div>
    <div class="form-row">
      ${makeImageUploadField({ id: 'in_cert', label: 'Certificate File (PDF, SVG, Image)', value: item?.cert_url||'', folder: 'internships', placeholder: 'assets/... or upload PDF/SVG' })}
      <div class="form-group"><label class="form-label">Certificate Title</label><input class="form-input" id="in_certt" value="${esc(item?.cert_title||'')}"></div>
    </div>
    <div class="form-row"><div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="in_order" value="${item?.display_order??0}"></div><div class="form-group"><label class="form-label">Active</label><label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="in_active" ${(item?.active??1)?'checked':''}><span>Active</span></label></div></div>
  `, async () => {
    const body = {
      company: v('in_co'), role: v('in_role'), start_date: v('in_sd'), end_date: v('in_ed'),
      location: v('in_loc'), logo_url: v('in_logo'), description: v('in_desc'),
      technologies: v('in_tech').split(',').map(s=>s.trim()).filter(Boolean),
      responsibilities: v('in_resp').split('\n').map(s=>s.trim()).filter(Boolean),
      achievements: v('in_ach').split('\n').map(s=>s.trim()).filter(Boolean),
      cert_url: v('in_cert'), cert_title: v('in_certt'),
      display_order: +v('in_order'), active: document.getElementById('in_active').checked
    };
    if (!body.company || !body.role) throw new Error('Company and role are required');
    if (isNew) { await api('POST', '/api/admin/internships', body); toast('Internship added!'); }
    else { await api('PUT', `/api/admin/internships/${item.id}`, body); toast('Internship updated!'); }
    closeFormModal(); renderInternships();
  });
}

// ── PROJECTS ──
async function renderProjects() {
  const data = await api('GET', '/api/admin/projects');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Projects</h2><p>${data.length} projects</p></div>
        <button class="btn btn-primary" id="addBtn">+ Add Project</button>
      </div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No projects yet</h3></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Published</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>${data.map(p => `<tr>
            <td><div style="display:flex;align-items:center;gap:8px;">${p.image_url ? `<img src="${esc(p.image_url)}" style="width:32px;height:24px;object-fit:cover;border-radius:4px;">` : ''}<strong>${esc(p.name)}</strong></div></td>
            <td style="font-size:12px;color:var(--lo)">${esc(p.category)}</td>
            <td><span class="tag-chip">${esc(p.badge_label)}</span></td>
            <td><span class="${p.published ? 'badge-active' : 'badge-inactive'}">${p.published ? 'Published' : 'Draft'}</span></td>
            <td>${p.display_order}</td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm edit-prj" data-id="${p.id}">Edit</button>
              <button class="btn btn-danger btn-sm del-prj" data-id="${p.id}" data-name="${esc(p.name)}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;
  document.getElementById('addBtn').addEventListener('click', () => openProjectModal(null));
  document.querySelectorAll('.edit-prj').forEach(btn => {
    btn.addEventListener('click', () => openProjectModal(data.find(d => d.id == btn.dataset.id)));
  });
  document.querySelectorAll('.del-prj').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('project', btn.dataset.id, btn.dataset.name, '/api/admin/projects/', renderProjects));
  });
}

function openProjectModal(item) {
  const isNew = !item;
  openFormModal(isNew ? 'Add Project' : 'Edit Project', `
    <div class="form-group"><label class="form-label">Project Name *</label><input class="form-input" id="pr_name" value="${esc(item?.name||'')}"></div>
    <div class="form-group"><label class="form-label">Short Description</label><textarea class="form-input" id="pr_short" rows="2">${esc(item?.short_desc||'')}</textarea></div>
    <div class="form-group"><label class="form-label">Full Description</label><textarea class="form-input" id="pr_full" rows="3">${esc(item?.full_desc||'')}</textarea></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Category</label><input class="form-input" id="pr_cat" value="${esc(item?.category||'')}"></div><div class="form-group"><label class="form-label">Role</label><input class="form-input" id="pr_role" value="${esc(item?.role||'')}"></div></div>
    ${makeImageUploadField({ id: 'pr_img', label: 'Project Preview Image (SVG / PNG / JPG / WebP)', value: item?.image_url||'', folder: 'projects', placeholder: 'assets/projects/... or upload' })}
    <div class="form-row"><div class="form-group"><label class="form-label">GitHub URL</label><input class="form-input" id="pr_gh" value="${esc(item?.github_url||'#')}"></div><div class="form-group"><label class="form-label">Live Demo URL</label><input class="form-input" id="pr_demo" value="${esc(item?.demo_url||'#')}"></div></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Status Text</label><input class="form-input" id="pr_status" value="${esc(item?.status||'Completed')}"></div><div class="form-group"><label class="form-label">Badge Label</label><input class="form-input" id="pr_badge" value="${esc(item?.badge_label||'Completed')}"></div></div>
    <div class="form-group"><label class="form-label">Tags (comma-separated)</label><input class="form-input" id="pr_tags" value="${esc((item?.tags||[]).join(', '))}"></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="pr_order" value="${item?.display_order??0}"></div><div class="form-group"><label class="form-label">Published</label><label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="pr_pub" ${(item?.published??1)?'checked':''}><span>Published</span></label></div></div>
  `, async () => {
    const body = {
      name: v('pr_name'), short_desc: v('pr_short'), full_desc: v('pr_full'),
      category: v('pr_cat'), role: v('pr_role'), image_url: v('pr_img'),
      github_url: v('pr_gh'), demo_url: v('pr_demo'), status: v('pr_status'), badge_label: v('pr_badge'),
      tags: v('pr_tags').split(',').map(s=>s.trim()).filter(Boolean),
      display_order: +v('pr_order'), published: document.getElementById('pr_pub').checked
    };
    if (!body.name) throw new Error('Project name is required');
    if (isNew) { await api('POST', '/api/admin/projects', body); toast('Project added!'); }
    else { await api('PUT', `/api/admin/projects/${item.id}`, body); toast('Project updated!'); }
    closeFormModal(); renderProjects();
  });
}

// ── CERTIFICATES ──
async function renderCertificates() {
  const data = await api('GET', '/api/admin/certificates');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Certificates</h2><p>${data.length} certificates</p></div>
        <button class="btn btn-primary" id="addBtn">+ Add Certificate</button>
      </div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No certificates yet</h3></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Title</th><th>Issuer</th><th>Year</th><th>Category</th><th>Active</th><th>Order</th><th>Actions</th></tr></thead>
          <tbody>${data.map(c => `<tr>
            <td><div style="display:flex;align-items:center;gap:8px;">${c.image_url ? `<img src="${esc(c.image_url)}" style="width:32px;height:24px;object-fit:cover;border-radius:4px;">` : ''}<strong>${esc(c.title)}</strong></div></td>
            <td>${esc(c.issuer)}</td><td>${esc(c.year)}</td>
            <td><span class="tag-chip">${esc(c.category)}</span></td>
            <td><span class="${c.active ? 'badge-active' : 'badge-inactive'}">${c.active ? 'Active' : 'Inactive'}</span></td>
            <td>${c.display_order}</td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm edit-cert" data-id="${c.id}">Edit</button>
              <button class="btn btn-danger btn-sm del-cert" data-id="${c.id}" data-name="${esc(c.title)}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;
  document.getElementById('addBtn').addEventListener('click', () => openCertModal(null));
  document.querySelectorAll('.edit-cert').forEach(btn => {
    btn.addEventListener('click', () => openCertModal(data.find(d => d.id == btn.dataset.id)));
  });
  document.querySelectorAll('.del-cert').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('certificate', btn.dataset.id, btn.dataset.name, '/api/admin/certificates/', renderCertificates));
  });
}

function openCertModal(item) {
  const isNew = !item;
  openFormModal(isNew ? 'Add Certificate' : 'Edit Certificate', `
    <div class="form-row"><div class="form-group"><label class="form-label">Issuer *</label><input class="form-input" id="ce_issuer" value="${esc(item?.issuer||'')}"></div><div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="ce_title" value="${esc(item?.title||'')}"></div></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Year</label><input class="form-input" id="ce_year" value="${esc(item?.year||'')}"></div><div class="form-group"><label class="form-label">Category</label><input class="form-input" id="ce_cat" value="${esc(item?.category||'Certification')}"></div></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="ce_desc" rows="3">${esc(item?.description||'')}</textarea></div>
    ${makeImageUploadField({ id: 'ce_img', label: 'Certificate Preview Image (SVG / PNG / JPG / WebP)', value: item?.image_url||'', folder: 'certificates', placeholder: 'assets/certificates/... or upload' })}
    <div class="form-row"><div class="form-group"><label class="form-label">Credential ID</label><input class="form-input" id="ce_cid" value="${esc(item?.credential_id||'')}"></div><div class="form-group"><label class="form-label">Credential URL</label><input class="form-input" id="ce_curl" value="${esc(item?.credential_url||'')}"></div></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="ce_order" value="${item?.display_order??0}"></div><div class="form-group"><label class="form-label">Active</label><label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="ce_active" ${(item?.active??1)?'checked':''}><span>Active</span></label></div></div>
  `, async () => {
    const body = {
      issuer: v('ce_issuer'), title: v('ce_title'), year: v('ce_year'), category: v('ce_cat'),
      description: v('ce_desc'), image_url: v('ce_img'), credential_id: v('ce_cid'), credential_url: v('ce_curl'),
      display_order: +v('ce_order'), active: document.getElementById('ce_active').checked
    };
    if (!body.issuer || !body.title) throw new Error('Issuer and title are required');
    if (isNew) { await api('POST', '/api/admin/certificates', body); toast('Certificate added!'); }
    else { await api('PUT', `/api/admin/certificates/${item.id}`, body); toast('Certificate updated!'); }
    closeFormModal(); renderCertificates();
  });
}

// ── EDUCATION ──
async function renderEducation() {
  const data = await api('GET', '/api/admin/education');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Education</h2><p>${data.length} entries</p></div>
        <button class="btn btn-primary" id="addBtn">+ Add Education</button>
      </div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No education entries yet</h3></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Degree</th><th>Institution</th><th>Period</th><th>Badge</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>${data.map(e => `<tr>
            <td><strong>${esc(e.degree)}</strong></td>
            <td>${esc(e.institution)}</td>
            <td style="font-size:12px;color:var(--lo)">${esc(e.start_year)} – ${esc(e.end_year)}</td>
            <td><span class="tag-chip">${esc(e.badge_text)}</span></td>
            <td><span class="${e.active ? 'badge-active' : 'badge-inactive'}">${e.active ? 'Active' : 'Inactive'}</span></td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm edit-edu" data-id="${e.id}">Edit</button>
              <button class="btn btn-danger btn-sm del-edu" data-id="${e.id}" data-name="${esc(e.degree)}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;
  document.getElementById('addBtn').addEventListener('click', () => openEduModal(null));
  document.querySelectorAll('.edit-edu').forEach(btn => {
    btn.addEventListener('click', () => openEduModal(data.find(d => d.id == btn.dataset.id)));
  });
  document.querySelectorAll('.del-edu').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('education entry', btn.dataset.id, btn.dataset.name, '/api/admin/education/', renderEducation));
  });
}

function openEduModal(item) {
  const isNew = !item;
  openFormModal(isNew ? 'Add Education' : 'Edit Education', `
    <div class="form-group"><label class="form-label">Degree *</label><input class="form-input" id="ed_deg" value="${esc(item?.degree||'')}"></div>
    <div class="form-group"><label class="form-label">Institution *</label><input class="form-input" id="ed_inst" value="${esc(item?.institution||'')}"></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Start Year</label><input class="form-input" id="ed_sy" value="${esc(item?.start_year||'')}"></div><div class="form-group"><label class="form-label">End Year</label><input class="form-input" id="ed_ey" value="${esc(item?.end_year||'')}"></div></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Badge Text (e.g. CGPA 8.6 / 10)</label><input class="form-input" id="ed_badge" value="${esc(item?.badge_text||'')}"></div><div class="form-group"><label class="form-label">Location</label><input class="form-input" id="ed_loc" value="${esc(item?.location||'')}"></div></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="ed_desc" rows="2">${esc(item?.description||'')}</textarea></div>
    <div class="form-group"><label class="form-label">Subjects / Achievements (comma-separated)</label><input class="form-input" id="ed_ach" value="${esc((item?.achievements||[]).join(', '))}"></div>
    <div class="form-row"><div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="ed_order" value="${item?.display_order??0}"></div><div class="form-group"><label class="form-label">Active</label><label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="ed_active" ${(item?.active??1)?'checked':''}><span>Active</span></label></div></div>
  `, async () => {
    const body = {
      degree: v('ed_deg'), institution: v('ed_inst'), start_year: v('ed_sy'), end_year: v('ed_ey'),
      badge_text: v('ed_badge'), location: v('ed_loc'), description: v('ed_desc'),
      achievements: v('ed_ach').split(',').map(s=>s.trim()).filter(Boolean),
      display_order: +v('ed_order'), active: document.getElementById('ed_active').checked
    };
    if (!body.degree || !body.institution) throw new Error('Degree and institution are required');
    if (isNew) { await api('POST', '/api/admin/education', body); toast('Education added!'); }
    else { await api('PUT', `/api/admin/education/${item.id}`, body); toast('Education updated!'); }
    closeFormModal(); renderEducation();
  });
}

// ── CONTACT SETTINGS ──
async function renderContact() {
  const data = await api('GET', '/api/admin/contact');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Contact Settings</h2></div>
        <button class="btn btn-primary" id="saveContact">Save Changes</button>
      </div>
      <div class="card">
        <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="co_email" value="${esc(data.email||'')}"></div><div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="co_phone" value="${esc(data.phone||'')}"></div></div>
        <div class="form-group"><label class="form-label">Location</label><input class="form-input" id="co_loc" value="${esc(data.location||'')}"></div>
        <div class="form-group"><label class="form-label">Availability Text</label><textarea class="form-input" id="co_avail" rows="2">${esc(data.availability_text||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Contact Description</label><textarea class="form-input" id="co_desc" rows="2">${esc(data.contact_desc||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Form Title</label><input class="form-input" id="co_title" value="${esc(data.form_title||'')}"></div>
        <div class="form-group"><label class="form-label">Contact Form</label>
          <label class="switch-wrap"><input type="checkbox" class="switch" id="co_form" ${data.form_enabled !== 0 ? 'checked' : ''}><span>Enable contact form</span></label>
        </div>
      </div>
    </div>`;
  document.getElementById('saveContact').addEventListener('click', async () => {
    try {
      await api('PUT', '/api/admin/contact', {
        email: v('co_email'), phone: v('co_phone'), location: v('co_loc'),
        availability_text: v('co_avail'), contact_desc: v('co_desc'),
        form_title: v('co_title'), form_enabled: document.getElementById('co_form').checked ? 1 : 0
      });
      toast('Contact settings saved!');
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── NAVBAR ──
async function renderNavbar() {
  const data = await api('GET', '/api/admin/navbar');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Navigation</h2><p>Manage navbar items visibility and order</p></div></div>
      <div class="card">
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Label</th><th>Section ID</th><th>Order</th><th>Visible</th><th>Actions</th></tr></thead>
          <tbody>${data.map(n => `<tr>
            <td><strong>${esc(n.label)}</strong></td>
            <td><code style="font-size:12px;color:var(--ac)">#${esc(n.section_id)}</code></td>
            <td>${n.display_order}</td>
            <td><span class="${n.visible ? 'badge-active' : 'badge-inactive'}">${n.visible ? 'Visible' : 'Hidden'}</span></td>
            <td><button class="btn btn-secondary btn-sm edit-nav" data-id="${n.id}">Edit</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`;
  document.querySelectorAll('.edit-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = data.find(d => d.id == btn.dataset.id);
      openFormModal('Edit Nav Item', `
        <div class="form-group"><label class="form-label">Label</label><input class="form-input" id="nv_label" value="${esc(n.label)}"></div>
        <div class="form-group"><label class="form-label">Section ID</label><input class="form-input" id="nv_sid" value="${esc(n.section_id)}"></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Display Order</label><input class="form-input" type="number" id="nv_order" value="${n.display_order}"></div><div class="form-group"><label class="form-label">Visible</label><label class="switch-wrap" style="margin-top:8px;"><input type="checkbox" class="switch" id="nv_vis" ${n.visible?'checked':''}><span>Visible</span></label></div></div>
      `, async () => {
        await api('PUT', `/api/admin/navbar/${n.id}`, { label: v('nv_label'), section_id: v('nv_sid'), display_order: +v('nv_order'), visible: document.getElementById('nv_vis').checked });
        toast('Nav item updated!'); closeFormModal(); renderNavbar();
      });
    });
  });
}

// ── SOCIAL LINKS & RESUME ──
async function renderSocial() {
  const data = await api('GET', '/api/admin/social-links');
  const resumeLink = data.find(s => s.platform.toLowerCase().includes('resume') || s.platform.toLowerCase().includes('cv'));

  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd">
        <div>
          <h2>Social Links & Resume</h2>
          <p>Manage your social profiles and uploaded resume / CV file</p>
        </div>
        <button class="btn btn-primary" id="addBtn">+ Add Social Link</button>
      </div>

      <!-- RESUME / CV SPECIAL CARD -->
      <div class="card" style="margin-bottom:24px;border:1px solid var(--br);background:linear-gradient(145deg, var(--sf), var(--sf2));">
        <div class="card-header" style="display:flex;align-items:center;justify-content:between;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:38px;height:38px;border-radius:10px;background:var(--ac-dim);display:flex;align-items:center;justify-content:center;color:var(--ac);">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
              <div style="font-size:15px;font-weight:600;color:var(--hi);">Resume / CV Document</div>
              <div style="font-size:12px;color:var(--lo);">Connected to the "Resume" button in your portfolio header</div>
            </div>
          </div>
          <div>
            ${resumeLink && resumeLink.url && resumeLink.url !== '#' ? '<span class="badge-active">Configured</span>' : '<span class="badge-inactive">Not Uploaded</span>'}
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;padding-top:8px;">
          <div style="font-size:13px;color:var(--md);flex:1;min-width:260px;">
            <strong>Current File / Link:</strong>
            <span style="color:var(--ac);word-break:break-all;margin-left:6px;">${resumeLink && resumeLink.url ? esc(resumeLink.url) : 'None (links to #)'}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${resumeLink && resumeLink.url && resumeLink.url !== '#' ? `
              <a href="${esc(resumeLink.url)}" target="_blank" download class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download / View
              </a>
            ` : ''}
            <label class="btn btn-primary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload New Resume (PDF)
              <input type="file" id="directResumeUpload" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none">
            </label>
          </div>
        </div>
      </div>

      <!-- ALL SOCIAL LINKS TABLE -->
      <div class="card">
        <div class="card-header"><span class="card-title">All Social & Platform Links</span></div>
        ${data.length === 0 ? '<div class="empty-state"><h3>No links yet</h3><p>Add your GitHub, LinkedIn, Resume, or other profiles.</p></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Platform</th><th>URL / Target</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${data.map(s => `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="width:24px;height:24px;border-radius:6px;background:var(--sf3);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ac);">
                  ${esc(s.platform.charAt(0).toUpperCase())}
                </span>
                <strong>${esc(s.platform)}</strong>
              </div>
            </td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              <a href="${esc(s.url)}" target="_blank" style="color:var(--ac);text-decoration:underline;">${esc(s.url)}</a>
            </td>
            <td>${s.display_order}</td>
            <td><span class="${s.active ? 'badge-active' : 'badge-inactive'}">${s.active ? 'Active' : 'Hidden'}</span></td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm edit-sl" data-id="${s.id}">Edit</button>
              <button class="btn btn-danger btn-sm del-sl" data-id="${s.id}" data-name="${esc(s.platform)}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;

  // Quick Resume Upload Handler
  const resumeUploadInp = document.getElementById('directResumeUpload');
  if (resumeUploadInp) {
    resumeUploadInp.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      toast('Uploading resume…', 'info');
      try {
        const res = await fetch('/api/admin/media/upload?folder=misc', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin'
        });
        const uploadRes = await res.json();
        if (!res.ok) throw new Error(uploadRes.error || 'Failed to upload');

        // Save into social_links table
        if (resumeLink) {
          await api('PUT', `/api/admin/social-links/${resumeLink.id}`, {
            platform: resumeLink.platform || 'Resume',
            url: uploadRes.url,
            display_order: resumeLink.display_order ?? 3,
            active: 1
          });
        } else {
          await api('POST', '/api/admin/social-links', {
            platform: 'Resume',
            url: uploadRes.url,
            display_order: 3,
            active: 1
          });
        }
        toast('Resume uploaded and updated successfully!');
        renderSocial();
      } catch (err) {
        toast(`Resume upload failed: ${err.message}`, 'error');
      }
    });
  }

  document.getElementById('addBtn').addEventListener('click', () => openSocialModal(null));
  document.querySelectorAll('.edit-sl').forEach(btn => {
    btn.addEventListener('click', () => openSocialModal(data.find(d => d.id == btn.dataset.id)));
  });
  document.querySelectorAll('.del-sl').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('social link', btn.dataset.id, btn.dataset.name, '/api/admin/social-links/', renderSocial));
  });
}

function openSocialModal(item) {
  const isNew = !item;
  const presets = [
    { name: 'GitHub', defaultUrl: 'https://github.com/username' },
    { name: 'LinkedIn', defaultUrl: 'https://linkedin.com/in/username' },
    { name: 'Email', defaultUrl: 'mailto:name@example.com' },
    { name: 'Resume', defaultUrl: '/uploads/misc/resume.pdf' },
    { name: 'Twitter', defaultUrl: 'https://x.com/username' },
    { name: 'YouTube', defaultUrl: 'https://youtube.com/@channel' },
    { name: 'Instagram', defaultUrl: 'https://instagram.com/username' },
    { name: 'LeetCode', defaultUrl: 'https://leetcode.com/username' }
  ];

  openFormModal(isNew ? 'Add Social Link / Resume' : 'Edit Social Link / Resume', `
    <div class="form-group">
      <label class="form-label">Platform Presets (click to autofill)</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        ${presets.map(p => `
          <button type="button" class="btn btn-secondary btn-sm preset-btn" data-name="${p.name}" data-url="${p.defaultUrl}" style="font-size:11px;padding:3px 8px;">
            + ${p.name}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Platform Name *</label>
        <input class="form-input" id="sl_plat" placeholder="e.g. GitHub, LinkedIn, Resume, Email…" value="${esc(item?.platform||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Display Order</label>
        <input class="form-input" type="number" id="sl_order" value="${item?.display_order??0}">
      </div>
    </div>
    ${makeImageUploadField({
      id: 'sl_url',
      label: 'Target URL or Document File (Upload PDF/Doc or Enter Link) *',
      value: item?.url||'',
      folder: 'misc',
      accept: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/svg+xml',
      placeholder: 'https://..., mailto:..., or click Upload for Resume PDF'
    })}
    <div class="form-group">
      <label class="form-label">Active</label>
      <label class="switch-wrap" style="margin-top:6px;">
        <input type="checkbox" class="switch" id="sl_active" ${(item?.active??1)?'checked':''}>
        <span>Visible on Portfolio</span>
      </label>
    </div>
  `, async () => {
    const body = {
      platform: v('sl_plat'),
      url: v('sl_url'),
      display_order: +v('sl_order'),
      active: document.getElementById('sl_active').checked
    };
    if (!body.platform || !body.url) throw new Error('Platform and URL are required');
    if (isNew) {
      await api('POST', '/api/admin/social-links', body);
      toast('Social link added!');
    } else {
      await api('PUT', `/api/admin/social-links/${item.id}`, body);
      toast('Social link updated!');
    }
    closeFormModal();
    renderSocial();
  });

  // Preset button click listener inside modal
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const platInp = document.getElementById('sl_plat');
      const urlInp = document.getElementById('sl_url');
      if (platInp) platInp.value = btn.dataset.name;
      if (urlInp && (!urlInp.value || urlInp.value === '#')) urlInp.value = btn.dataset.url;
      window.updateImageFieldPreview('sl_url');
    });
  });
}

// ── MEDIA LIBRARY ──
async function renderMedia() {
  const data = await api('GET', '/api/admin/media');
  const isImg = m => m.mimetype.startsWith('image/');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Media Library</h2><p>${data.length} files</p></div>
        <label class="btn btn-primary" style="cursor:pointer">
          <input type="file" id="mediaUpload" style="display:none" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" multiple>
          + Upload Files
        </label>
      </div>
      <div class="card">
        ${data.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <h3>No files uploaded yet</h3><p>Upload images, SVGs, or PDFs for your portfolio.</p>
          </div>` : `
        <div class="media-grid">
          ${data.map(m => `
            <div class="media-item card" style="padding:10px;">
              <div class="media-thumb" style="width:100%;aspect-ratio:4/3;overflow:hidden;border-radius:8px;background:var(--sf2);display:flex;align-items:center;justify-content:center;">
                ${isImg(m) ? `<img src="${esc(m.url)}" style="width:100%;height:100%;object-fit:cover;">` : `<svg viewBox="0 0 24 24" width="32" height="32" stroke="var(--lo)" fill="none" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`}
              </div>
              <div style="margin-top:8px;">
                <div style="font-size:11px;color:var(--md);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(m.original_name)}">${esc(m.original_name)}</div>
                <div style="font-size:10px;color:var(--xs);">${formatBytes(m.size_bytes)}</div>
                <div style="display:flex;gap:4px;margin-top:6px;">
                  <button class="btn btn-secondary btn-sm" style="flex:1;padding:4px 6px;font-size:10px;" onclick="copyUrl('${esc(m.url)}')">Copy URL</button>
                  <button class="btn btn-danger btn-sm del-media" style="padding:4px 8px;" data-id="${m.id}" data-name="${esc(m.original_name)}">×</button>
                </div>
              </div>
            </div>`).join('')}
        </div>`}
      </div>
    </div>`;

  // File upload
  document.getElementById('mediaUpload').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const fd = new FormData(); fd.append('file', file);
      try {
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast(`Uploaded: ${file.name}`);
      } catch(err) { toast(`Upload failed: ${err.message}`, 'error'); }
    }
    renderMedia();
  });

  document.querySelectorAll('.del-media').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('file', btn.dataset.id, btn.dataset.name, '/api/admin/media/', renderMedia));
  });
}

function copyUrl(url) {
  navigator.clipboard.writeText(window.location.origin + url).then(() => toast('URL copied to clipboard!'));
}
function formatBytes(b) { if (!b) return '0B'; const k=1024,s=['B','KB','MB']; let i=0,n=b; while(n>=k&&i<s.length-1){n/=k;i++;} return n.toFixed(1)+' '+s[i]; }
window.copyUrl = copyUrl;

// ── SITE SETTINGS ──
async function renderSettings() {
  const data = await api('GET', '/api/admin/settings');
  const sections = ['home','about','skills','internship','projects','certificates','education','contact'];
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Site Settings</h2></div>
        <button class="btn btn-primary" id="saveSettings">Save Changes</button>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">Global Information</span></div>
        <div class="form-group"><label class="form-label">Site Title</label><input class="form-input" id="st_title" value="${esc(data.site_title||'')}"></div>
        <div class="form-group"><label class="form-label">Meta Description</label><textarea class="form-input" id="st_desc" rows="2">${esc(data.meta_desc||'')}</textarea></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Author Name</label><input class="form-input" id="st_author" value="${esc(data.author||'')}"></div><div class="form-group"><label class="form-label">Contact Email</label><input class="form-input" id="st_email" value="${esc(data.email||'')}"></div></div>
        <div class="form-group"><label class="form-label">Copyright Text</label><input class="form-input" id="st_copy" value="${esc(data.copyright||'')}"></div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">Section Visibility</span></div>
        <p style="font-size:13px;color:var(--lo);margin-bottom:16px">Disable a section to hide it from the public portfolio without deleting its data.</p>
        ${sections.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--br3);">
            <span style="font-size:14px;color:var(--md);text-transform:capitalize">${s}</span>
            <label class="switch-wrap">
              <input type="checkbox" class="switch sec-toggle" id="sec_${s}" data-sec="${s}" ${data['section_'+s] !== 0 ? 'checked' : ''}>
              <span>${data['section_'+s] !== 0 ? 'Visible' : 'Hidden'}</span>
            </label>
          </div>`).join('')}
      </div>

      <!-- BACKUP & RESTORE / SNAPSHOT PERSISTENCE -->
      <div class="card" style="border:1px solid var(--br);">
        <div class="card-header"><span class="card-title">💾 Database Backup & Persistence Snapshot</span></div>
        <p style="font-size:13px;color:var(--lo);margin-bottom:16px">
          All modifications automatically sync to your persistent state snapshot. You can also export a complete JSON backup to your computer or restore one at any time.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
          <a href="/api/admin/backup" download="portfolio-backup.json" class="btn btn-secondary" style="display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Backup (JSON)
          </a>
          <label class="btn btn-secondary" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import & Restore (JSON)
            <input type="file" id="importBackupInp" accept="application/json" style="display:none">
          </label>
          <button class="btn btn-primary" id="btnSyncSnapshot" style="display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Sync State Snapshot
          </button>
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.sec-toggle').forEach(cb => {
    cb.addEventListener('change', () => { cb.nextElementSibling.textContent = cb.checked ? 'Visible' : 'Hidden'; });
  });
  document.getElementById('saveSettings').addEventListener('click', async () => {
    try {
      const body = { site_title: v('st_title'), meta_desc: v('st_desc'), author: v('st_author'), email: v('st_email'), copyright: v('st_copy') };
      sections.forEach(s => { body['section_'+s] = document.getElementById('sec_'+s).checked ? 1 : 0; });
      await api('PUT', '/api/admin/settings', body);
      toast('Site settings saved!');
    } catch(e) { toast(e.message, 'error'); }
  });

  // Manual snapshot sync
  const syncBtn = document.getElementById('btnSyncSnapshot');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      try {
        syncBtn.disabled = true;
        const res = await api('POST', '/api/admin/sync-snapshot');
        toast('State snapshot synced successfully!');
      } catch(e) {
        toast('Failed to sync snapshot: ' + e.message, 'error');
      } finally {
        syncBtn.disabled = false;
      }
    });
  }

  // Import JSON backup
  const importInp = document.getElementById('importBackupInp');
  if (importInp) {
    importInp.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (!json || !json.data) throw new Error('Invalid portfolio backup file format.');
        if (!confirm('This will replace your current portfolio data with the backup file. Proceed?')) return;
        toast('Restoring data…', 'info');
        const res = await api('POST', '/api/admin/restore', json);
        toast('Database successfully restored from backup!');
        renderSettings();
      } catch(err) {
        toast(`Import failed: ${err.message}`, 'error');
      }
    });
  }
}

// ── MESSAGES ──
async function renderMessages() {
  const data = await api('GET', '/api/admin/messages');
  const unread = data.filter(m => !m.read).length;
  const badge = document.getElementById('msgBadge');
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }

  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Messages</h2><p>${data.length} total, ${unread} unread</p></div></div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No messages yet</h3><p>Messages submitted via the contact form will appear here.</p></div>' : `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>${data.map(m => `<tr style="${!m.read ? 'background:var(--ac-dim2)' : ''}">
            <td><strong>${esc(m.name)}</strong></td>
            <td><a href="mailto:${esc(m.email)}" style="color:var(--ac)">${esc(m.email)}</a></td>
            <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(m.message)}">${esc(m.message)}</td>
            <td style="font-size:11px;color:var(--lo)">${new Date(m.created_at).toLocaleString()}</td>
            <td><span class="${!m.read ? 'badge-active' : 'badge-inactive'}">${!m.read ? 'Unread' : 'Read'}</span></td>
            <td><div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="markMsg(${m.id},${!m.read})">Mark ${m.read ? 'Unread' : 'Read'}</button>
              <button class="btn btn-danger btn-sm del-msg" data-id="${m.id}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>`;

  window.markMsg = async (id, markRead) => {
    await api('PUT', `/api/admin/messages/${id}/${markRead ? 'read' : 'unread'}`);
    toast(markRead ? 'Marked as read' : 'Marked as unread', 'info');
    renderMessages();
  };
  document.querySelectorAll('.del-msg').forEach(btn => {
    btn.addEventListener('click', () => deleteItem('message', btn.dataset.id, 'this message', '/api/admin/messages/', renderMessages));
  });
}

// ── ACTIVITY LOG ──
async function renderActivity() {
  const data = await api('GET', '/api/admin/activity');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Activity Log</h2><p>Last 100 admin actions</p></div></div>
      <div class="card">
        ${data.length === 0 ? '<div class="empty-state"><h3>No activity yet</h3></div>' : data.map(a => `
          <div class="activity-item">
            <div class="activity-dot" style="background:${a.action==='DELETE'?'var(--red)':a.action==='CREATE'?'var(--ac)':a.action==='LOGIN'?'var(--blue)':'var(--yellow)'}"></div>
            <div>
              <div class="activity-text"><strong>${a.action}</strong> ${a.entity} ${a.detail ? '— ' + esc(a.detail) : ''}</div>
              <div class="activity-time">${new Date(a.created_at).toLocaleString()}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── APPEARANCE ──
async function renderAppearance() {
  const data = await api('GET', '/api/admin/settings');
  content.innerHTML = `
    <div class="page-fade">
      <div class="section-hd"><div><h2>Appearance</h2><p>Safe visual customization</p></div>
        <button class="btn btn-primary" id="saveAppearance">Save</button>
      </div>
      <div class="card">
        <p style="font-size:13px;color:var(--lo);margin-bottom:20px">These settings affect the public portfolio's accent colors. The overall design system (fonts, animations, layout) is preserved.</p>
        <div class="form-group">
          <label class="form-label">Accent Color (used in dark mode)</label>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${['#34d36e','#22c55e','#4ade80','#6aadcb','#60a5fa','#f59e0b','#e879f9'].map(c =>
              `<button onclick="document.getElementById('ap_accent').value='${c}';this.parentElement.querySelectorAll('button').forEach(b=>b.style.outline='none');this.style.outline='3px solid ${c}'"
                style="width:36px;height:36px;border-radius:50%;background:${c};border:none;cursor:pointer;${data.accent_color===c?'outline:3px solid '+c+';outline-offset:3px':''}" title="${c}"></button>`).join('')}
          </div>
          <input class="form-input" id="ap_accent" value="${esc(data.accent_color||'#34d36e')}" placeholder="#34d36e" style="margin-top:12px;max-width:180px;">
        </div>
        <p style="font-size:12px;color:var(--xs);margin-top:8px">Note: This is stored as a setting. To apply it to the live site, the CSS custom properties would need to be updated server-side or via a separate theme mechanism.</p>
      </div>
    </div>`;
  document.getElementById('saveAppearance').addEventListener('click', async () => {
    await api('PUT', '/api/admin/settings', { accent_color: v('ap_accent') });
    toast('Appearance saved!', 'success');
  });
}

// ── HELPERS ──
function v(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

async function deleteItem(type, id, name, apiBase, rerender) {
  const ok = await confirm(`Delete ${type}?`, `Are you sure you want to delete "${name}"?`, 'This action cannot be undone.');
  if (!ok) return;
  try {
    await api('DELETE', `${apiBase}${id}`);
    toast(`${type} deleted`);
    rerender();
  } catch(e) { toast(e.message, 'error'); }
}

// ── INIT ──
async function init() {
  await checkAuth();
  navigate('dashboard');
}

init();

})();

