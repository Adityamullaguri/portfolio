/**
 * data.js — Portfolio data loader
 * Fetches all portfolio content from the API and stores on window.__PD
 * before script.js runs its animation initializers.
 *
 * IMPORTANT: This must be loaded BEFORE script.js via <script src="data.js" defer></script>
 */
(function () {
  // Default data (fallback if API is unreachable — keeps site working even offline)
  window.__PD = {
    home: null,
    about: null,
    skills: [],
    internships: [],
    projects: [],
    certificates: [],
    certsData: [],
    certs: {},
    education: [],
    socialLinks: [],
    navbar: [],
    settings: {},
    contact: {}
  };

  // Fetch all data in parallel with cache-busting
  const endpoints = [
    '/api/home', '/api/about', '/api/skills', '/api/internships',
    '/api/projects', '/api/certificates', '/api/education',
    '/api/social-links', '/api/navbar', '/api/settings', '/api/contact-settings'
  ];

  Promise.all(endpoints.map(url =>
    fetch(`${url}?_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null)
  )).then(([home, about, skills, internships, projects, certificates, education, socialLinks, navbar, settings, contact]) => {

    window.__PD.home = home || null;
    window.__PD.about = about || null;
    window.__PD.skills = (skills || []).map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      logo: s.logo_url,
      description: s.description
    }));
    window.__PD.internships = internships || [];
    window.__PD.projects = {};
    (projects || []).forEach(p => {
      const key = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + p.id;
      window.__PD.projects[key] = {
        id: p.id,
        _key: key,
        title: p.name,
        category: p.category,
        role: p.role,
        status: p.status,
        image: p.image_url,
        description: p.full_desc || p.short_desc,
        tags: p.tags || [],
        github_url: p.github_url,
        demo_url: p.demo_url,
        badge_label: p.badge_label,
        published: p.published,
        display_order: p.display_order
      };
    });
    window.__PD.projectsList = (projects || []).map(p => ({
      ...p,
      _key: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + p.id
    }));

    function generateCertCardSvg(title, issuer) {
      const t = (title || 'Certificate of Completion').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const isr = (issuer || 'Course Certification').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
        <defs>
          <linearGradient id="cbg_${Math.random().toString(36).substr(2,4)}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b111e" />
            <stop offset="50%" stop-color="#141e33" />
            <stop offset="100%" stop-color="#090d16" />
          </linearGradient>
          <linearGradient id="cgold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fcd34d" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <linearGradient id="cac" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#34d36e" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
        </defs>
        <rect width="800" height="550" rx="16" fill="#0f172a" stroke="rgba(52,211,110,0.3)" stroke-width="2"/>
        <rect x="22" y="22" width="756" height="506" rx="12" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" stroke-dasharray="8 6"/>
        <rect x="34" y="34" width="732" height="482" rx="8" fill="none" stroke="rgba(52,211,110,0.18)" stroke-width="1"/>
        <rect x="240" y="52" width="320" height="34" rx="17" fill="rgba(52,211,110,0.12)" stroke="rgba(52,211,110,0.3)"/>
        <text x="400" y="74" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#34d36e" text-anchor="middle" letter-spacing="1.5">${isr.toUpperCase()}</text>
        <text x="400" y="145" font-family="Georgia, serif" font-size="20" fill="#94a3b8" text-anchor="middle" letter-spacing="3">CERTIFICATE OF COMPLETION</text>
        <text x="400" y="180" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">This is to certify that</text>
        <text x="400" y="230" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" fill="#f8fafc" text-anchor="middle" letter-spacing="1">ADITYA</text>
        <line x1="260" y1="250" x2="540" y2="250" stroke="rgba(52,211,110,0.4)" stroke-width="1.5"/>
        <text x="400" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#64748b" text-anchor="middle">has successfully completed</text>
        <text x="400" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="url(#cac)" text-anchor="middle">${t}</text>
        <g transform="translate(400, 425)">
          <circle cx="0" cy="0" r="34" fill="url(#cgold)" opacity="0.95"/>
          <circle cx="0" cy="0" r="28" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3"/>
          <polygon points="0,-14 3.5,-5 13,-5 6,2 9,11 0,5 -9,11 -6,2 -13,-5 -3.5,-5" fill="#ffffff"/>
          <text x="0" y="22" font-family="system-ui, sans-serif" font-size="7.5" font-weight="800" fill="#0f172a" text-anchor="middle" letter-spacing="1">VERIFIED</text>
        </g>
        <text x="60" y="495" font-family="system-ui, sans-serif" font-size="11" fill="#64748b">ISSUER: <tspan fill="#cbd5e1">${isr}</tspan></text>
        <text x="740" y="495" font-family="system-ui, sans-serif" font-size="11" fill="#64748b" text-anchor="end">CREDENTIAL: <tspan fill="#34d36e">OFFICIAL VERIFIED</tspan></text>
      </svg>`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    window.__generateCertSvg = generateCertCardSvg;

    window.__PD.certsData = (certificates || []).map(c => {
      const key = c.cert_key || (c.title ? c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ('cert-' + c.id));
      const raw = c.image_url || '';
      const isPdf = raw.toLowerCase().endsWith('.pdf') || raw.includes('.pdf?');
      const img = (isPdf || !raw) ? generateCertCardSvg(c.title, c.issuer) : raw;
      return {
        id: c.id,
        cert_key: key,
        imageSrc: img,
        rawUrl: raw,
        isPdf: isPdf,
        title: c.title,
        issuer: c.issuer,
        alt: c.title,
        ariaLabel: `View ${c.title} certificate details`
      };
    });
    window.__PD.certs = {};
    (certificates || []).forEach(c => {
      const key = c.cert_key || (c.title ? c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : ('cert-' + c.id));
      const raw = c.image_url || '';
      const isPdf = raw.toLowerCase().endsWith('.pdf') || raw.includes('.pdf?');
      const img = (isPdf || !raw) ? generateCertCardSvg(c.title, c.issuer) : raw;
      const obj = {
        id: c.id,
        cert_key: key,
        imageSrc: img,
        rawUrl: raw,
        isPdf: isPdf,
        title: c.title,
        issuer: c.issuer,
        category: c.category || 'Certification',
        year: c.year || '2024',
        description: c.description || '',
        credentialId: c.credential_id || 'Verified'
      };
      window.__PD.certs[key] = obj;
      window.__PD.certs[String(c.id)] = obj;
    });

    window.__PD.education = (education || []).map(e => ({
      ...e,
      achievements: e.achievements || []
    }));

    window.__PD.socialLinks = socialLinks || [];
    window.__PD.navbar = navbar || [];
    window.__PD.settings = settings || {};
    window.__PD.contact = contact || {};

    // Apply dynamic data to the DOM
    applyHomeData();
    applyAboutData();
    applyInternshipData();
    applyProjectCards();
    applyCertCarousel();
    applyEducationTimeline();
    applySocialLinks();
    applyContactData();
    applySiteSettings();

    // Signal that data is ready (script.js listens for this)
    document.dispatchEvent(new CustomEvent('portfolioDataReady'));

  }).catch(err => {
    console.warn('Portfolio API unavailable, using fallback data:', err);
    document.dispatchEvent(new CustomEvent('portfolioDataReady'));
  });

  // ── Apply Home Data ──
  function applyHomeData() {
    const h = window.__PD.home;
    if (!h) return;
    const qs = sel => document.querySelector(sel);

    if (h.greeting) { const el = qs('.h-greet'); if (el) el.textContent = h.greeting; }
    if (h.name) { const el = qs('.h-name'); if (el) el.textContent = h.name; }
    if (h.role_line1 || h.role_line2) {
      const el = qs('.h-role');
      if (el) el.innerHTML = `${h.role_line1 || ''}<br><span class="h-role-amp">&amp;</span> ${(h.role_line2 || '').replace(/^&\s*/, '')}`;
    }
    if (h.description) { const el = qs('.h-bio'); if (el) el.textContent = h.description; }
    if (h.btn_primary_text) { const el = qs('.hero-btn-p'); if (el) { el.textContent = h.btn_primary_text; el.href = h.btn_primary_link || '#projects'; } }
    if (h.btn_secondary_text) { const el = qs('.hero-btn-s'); if (el) { el.textContent = h.btn_secondary_text; el.href = h.btn_secondary_link || '#contact'; } }

    // Chips
    if (h.chips && h.chips.length) {
      const container = qs('.h-chips');
      if (container) {
        container.innerHTML = h.chips.map(c => `<span class="chip h-chip">${c}</span>`).join('');
      }
    }

    // Portrait images (handles light & dark modes with smart fallback)
    const elLight = qs('.h-portrait-light');
    const elDark  = qs('.h-portrait-dark');
    const lightImg = h.hero_image_light || '';
    const darkImg  = h.hero_image_dark || '';

    // If user uploaded a custom image for one mode, use it as fallback for the other
    const isCustomLight = lightImg && !lightImg.endsWith('portrait.png') && !lightImg.endsWith('portrait-dark.png');
    const isCustomDark  = darkImg  && !darkImg.endsWith('portrait.png') && !darkImg.endsWith('portrait-dark.png');

    const finalLight = lightImg || (isCustomDark ? darkImg : 'portrait.png');
    const finalDark  = darkImg  || (isCustomLight ? lightImg : 'portrait-dark.png');

    if (elLight) {
      elLight.src = finalLight;
      elLight.onerror = () => { elLight.src = isCustomDark ? darkImg : 'portrait.png'; };
    }
    if (elDark) {
      elDark.src = finalDark;
      elDark.onerror = () => { elDark.src = isCustomLight ? lightImg : 'portrait-dark.png'; };
    }
  }

  // ── Apply About Data ──
  function applyAboutData() {
    const a = window.__PD.about;
    if (!a) return;
    const qs = sel => document.querySelector(sel);

    if (a.intro) { const el = qs('.ab-intro'); if (el) el.innerHTML = a.intro; }

    if (a.bio && a.bio.length) {
      const body = qs('.ab-body');
      if (body) body.innerHTML = a.bio.map(p => `<p class="bio-p">${p}</p>`).join('');
    }

    if (a.info_rows && a.info_rows.length) {
      const card = qs('.ab-info-card');
      if (card) {
        card.innerHTML = a.info_rows.map(row => `
          <div class="ab-info-row">
            <span class="ab-lbl">${row.label}</span>
            <span class="ab-val">${row.value.includes('Seeking') ? `<span class="badge">${row.value}</span>` : row.value}</span>
          </div>`).join('');
      }
    }

    if (a.image1_src) {
      const el = qs('.ab-img-card:nth-child(1) .ab-img');
      if (el) {
        el.src = a.image1_src;
        el.alt = a.image1_alt || '';
        el.onerror = () => { el.src = 'about-workspace.jpg'; };
      }
    }
    if (a.image1_caption) { const el = qs('.ab-img-card:nth-child(1) .ab-caption'); if (el) el.textContent = a.image1_caption; }
    if (a.image2_src) {
      const el = qs('.ab-img-card:nth-child(2) .ab-img');
      if (el) {
        el.src = a.image2_src;
        el.alt = a.image2_alt || '';
        el.onerror = () => { el.src = 'about-dataviz.jpg'; };
      }
    }
    if (a.image2_caption) { const el = qs('.ab-img-card:nth-child(2) .ab-caption'); if (el) el.textContent = a.image2_caption; }
  }

  // ── Apply Internship Data ──
  function applyInternshipData() {
    const internships = window.__PD.internships;
    if (!internships || !internships.length) return;
    const qs = sel => document.querySelector(sel);

    // For now populate primary internship (first active)
    const i = internships[0];
    if (!i) return;

    const logoImg = qs('.exp-logo-img');
    if (logoImg) { logoImg.src = i.logo_url || ''; logoImg.alt = i.company + ' Logo'; }
    const roleEl = qs('.exp-role');
    if (roleEl) roleEl.textContent = i.role;
    const companyEl = qs('.exp-company');
    if (companyEl) companyEl.textContent = i.company;

    const badgeEl = qs('.exp-badge');
    if (badgeEl) badgeEl.textContent = `Internship · ${i.location || 'Remote'}`;
    const dateEl = qs('.exp-date');
    if (dateEl) dateEl.textContent = `${i.start_date} — ${i.end_date}`;

    const certBtn = qs('.exp-cert-btn');
    if (certBtn && i.cert_url) {
      certBtn.dataset.cert = i.cert_url;
      certBtn.dataset.role = i.role;
      certBtn.dataset.company = i.company;
      const ext = i.cert_url.split('.').pop().toLowerCase();
      certBtn.dataset.certType = ext === 'pdf' ? 'pdf' : ext === 'svg' ? 'svg' : 'img';
    }

    // Feature cards from responsibilities
    if (i.responsibilities && i.responsibilities.length) {
      const grid = qs('.exp-cards-grid');
      if (grid) {
        const icons = ['⚡','📊','☁️','🔧','🚀','💡'];
        grid.innerHTML = i.responsibilities.map((r, idx) => {
          const tags = i.technologies ? i.technologies.slice(idx*2, idx*2+3) : [];
          return `<div class="exp-card vis" data-r>
            <div class="exp-card-body">
              <div class="exp-icon-box">${icons[idx] || '🔹'}</div>
              <h4 class="exp-card-title">Responsibility ${idx+1}</h4>
              <p class="exp-card-desc">${r}</p>
            </div>
            <div class="exp-card-tags">${tags.map(t => `<span class="tg">${t}</span>`).join('')}</div>
          </div>`;
        }).join('');
      }
    }
  }

  // ── Apply Project Cards ──
  function applyProjectCards() {
    const projects = window.__PD.projectsList;
    if (!projects || !projects.length) return;

    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    const statusClass = s => {
      if (!s) return 'status-completed';
      const l = s.toLowerCase();
      if (l.includes('live')) return 'status-live';
      if (l.includes('progress')) return 'status-progress';
      return 'status-completed';
    };

    grid.innerHTML = projects.map(p => `
      <div class="prj-card vis" data-r>
        <div class="prj-img-box">
          <img src="${p.image_url || ''}" alt="${p.name} Preview" class="prj-img" onerror="this.src='assets/projects/smart-hydroponics.svg'">
          <span class="prj-badge ${statusClass(p.badge_label)}">${p.badge_label || 'Completed'}</span>
        </div>
        <div class="prj-content">
          <div class="prj-top-row">
            <h3 class="prj-title">${p.name}</h3>
            <div class="prj-menu-wrap">
              <button type="button" class="prj-menu-btn" aria-label="Project menu" data-prj="${p._key}">⋯</button>
              <div class="prj-dropdown">
                <button type="button" class="prj-dropdown-item open-prj-modal" data-id="${p._key}">View Details</button>
                ${p.github_url && p.github_url !== '#' ? `<a href="${p.github_url}" target="_blank" rel="noopener" class="prj-dropdown-item">GitHub Repo ↗</a>` : ''}
                ${p.demo_url && p.demo_url !== '#' ? `<a href="${p.demo_url}" target="_blank" rel="noopener" class="prj-dropdown-item">Live Demo ↗</a>` : ''}
              </div>
            </div>
          </div>
          <p class="prj-category">${p.category || ''}</p>
          <p class="prj-desc">${p.short_desc || ''}</p>
          <div class="prj-footer">
            <div class="prj-tags">${(p.tags || []).slice(0,4).map(t => `<span class="tg">${t}</span>`).join('')}</div>
            <button type="button" class="prj-view-btn open-prj-modal" data-id="${p._key}" aria-label="View ${p.name} project details">
              <span>View Project</span><span class="prj-arr">→</span>
            </button>
          </div>
        </div>
      </div>`).join('');

    // Ensure all dynamic elements are visible
    grid.querySelectorAll('.prj-card').forEach(el => el.classList.add('vis'));
  }

  // ── Apply Certificate Carousel ──
  function applyCertCarousel() {
    const certs = window.__PD.certsData;
    if (!certs || !certs.length) return;

    // Update main card
    const mainCard = document.getElementById('certMainCard');
    const mainImg = document.getElementById('certMainImg');
    const mainIssuer = document.getElementById('certMainIssuer');
    const mainTitle = document.getElementById('certMainTitle');
    if (certs[0]) {
      if (mainImg) {
        mainImg.src = certs[0].imageSrc;
        mainImg.alt = certs[0].alt;
        mainImg.onerror = function() {
          this.onerror = null;
          if (window.__generateCertSvg) this.src = window.__generateCertSvg(certs[0].title, certs[0].issuer);
        };
      }
      if (mainIssuer) mainIssuer.textContent = certs[0].issuer;
      if (mainTitle) mainTitle.textContent = certs[0].title;
      if (mainCard) mainCard.dataset.certId = certs[0].cert_key;
    }

    // Rebuild thumbnail strip
    const thumbStrip = document.getElementById('certThumbs');
    if (thumbStrip) {
      thumbStrip.innerHTML = certs.map((c, i) => `
        <button class="cert-thumb ${i === 0 ? 'cert-thumb-active' : ''}" data-idx="${i}"
                role="tab" aria-selected="${i === 0 ? 'true' : 'false'}"
                aria-label="${c.title}">
          <img src="${c.imageSrc}" onerror="this.onerror=null; if (window.__generateCertSvg) this.src=window.__generateCertSvg('${(c.title||'').replace(/'/g, "\\'")}', '${(c.issuer||'').replace(/'/g, "\\'")}');" alt="" loading="lazy">
        </button>`).join('');
    }
  }

  // ── Apply Education Timeline ──
  function applyEducationTimeline() {
    const education = window.__PD.education;
    if (!education || !education.length) return;

    const itemsContainer = document.querySelector('.edu-timeline-items');
    if (!itemsContainer) return;

    itemsContainer.innerHTML = education.map((e, idx) => `
      <div class="edu-item" data-edu-idx="${idx}">
        <div class="edu-dot-wrap">
          <div class="edu-dot active" id="eduDot-${idx}"></div>
        </div>
        <div class="edu-card visible" id="eduCard-${idx}">
          <div class="edu-card-header">
            <span class="edu-year">${e.start_year} – ${e.end_year}</span>
            ${e.badge_text ? `<span class="edu-badge">${e.badge_text}</span>` : ''}
          </div>
          <h3 class="ed">${e.degree}</h3>
          <p class="ei">${e.institution}</p>
          ${e.achievements && e.achievements.length ? `
            <div class="tags" style="margin-top:14px">
              ${e.achievements.map(a => `<span class="tg">${a}</span>`).join('')}
            </div>` : ''}
          ${e.description ? `<p class="ey" style="margin-top:8px">${e.description}</p>` : ''}
        </div>
      </div>`).join('');
  }

  // ── Apply Social Links ──
  function applySocialLinks() {
    const links = window.__PD.socialLinks;
    if (!links || !links.length) return;

    const svgMap = {
      'github': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>`,
      'linkedin': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
      'email': `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>`,
      'resume': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      'twitter': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`,
      'instagram': `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
      'youtube': `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>`
    };

    // Populate hero social links
    const heroSocial = document.querySelector('.h-social');
    if (heroSocial) {
      heroSocial.innerHTML = links.map(l => {
        const key = l.platform.toLowerCase();
        const svg = l.icon_svg || svgMap[key] || svgMap['email'];
        const isEmail = l.url.startsWith('mailto:') || key === 'email';
        const isResume = key.includes('resume') || key.includes('cv');
        const downloadAttr = isResume && l.url && l.url !== '#' ? 'download' : '';
        return `<a href="${l.url}" ${!isEmail ? 'target="_blank" rel="noopener"' : ''} ${downloadAttr} class="h-soc-link" id="social-${key}" aria-label="${l.platform}">
          ${svg}<span>${l.platform}</span>
        </a>`;
      }).join('');
    }

    // Populate contact section links
    const contactLinks = document.querySelector('.cl');
    if (contactLinks) {
      contactLinks.innerHTML = links.map(l => {
        const key = l.platform.toLowerCase();
        const svg = l.icon_svg || svgMap[key] || svgMap['email'];
        const isEmail = l.url.startsWith('mailto:') || key === 'email';
        const isResume = key.includes('resume') || key.includes('cv');
        const downloadAttr = isResume && l.url && l.url !== '#' ? 'download' : '';
        const label = key === 'email' ? l.url.replace('mailto:', '') : l.url.replace(/^https?:\/\//,'').replace(/\/$/,'');
        return `<a href="${l.url}" ${!isEmail ? 'target="_blank" rel="noopener"' : ''} ${downloadAttr} class="ca">
          ${svg}${label}
        </a>`;
      }).join('');
    }
  }

  // ── Apply Contact Data ──
  function applyContactData() {
    const c = window.__PD.contact;
    const qs = sel => document.querySelector(sel);
    if (c && (c.availability_text || c.contact_desc)) {
      const el = qs('.ci2');
      if (el) el.textContent = `${c.availability_text || ''} ${c.contact_desc || ''}`.trim();
    }
    // Wire contact form to API
    const form = document.getElementById('contactForm') || qs('.form');
    if (form && (!c || c.form_enabled !== 0)) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('contactSubmit') || form.querySelector('button[type="submit"]');
        const nameInput = document.getElementById('contactName') || form.querySelector('input[type="text"]');
        const emailInput = document.getElementById('contactEmail') || form.querySelector('input[type="email"]');
        const msgInput = document.getElementById('contactMessage') || form.querySelector('textarea');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = msgInput ? msgInput.value.trim() : '';

        if (!name || !email || !message) {
          alert('Please fill in your name, email, and message.');
          return;
        }

        const originalBtnText = btn ? btn.textContent : 'Send Message →';
        if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            if (btn) btn.textContent = '✓ Message Sent Successfully!';
            form.reset();
            setTimeout(() => {
              if (btn) {
                btn.textContent = originalBtnText;
                btn.disabled = false;
              }
            }, 3500);
          } else {
            throw new Error(data.error || 'Failed to send message');
          }
        } catch (err) {
          alert('Error: ' + err.message);
          if (btn) {
            btn.textContent = originalBtnText;
            btn.disabled = false;
          }
        }
      });
    }
  }

  // ── Apply Site Settings ──
  function applySiteSettings() {
    const s = window.__PD.settings;
    if (!s) return;
    if (s.site_title) document.title = s.site_title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && s.meta_desc) metaDesc.content = s.meta_desc;

    // Hide disabled sections
    const sectionMap = {
      section_home: 'home', section_about: 'about', section_skills: 'skills',
      section_internship: 'internship', section_projects: 'projects',
      section_certificates: 'certificates', section_education: 'education',
      section_contact: 'contact'
    };
    Object.entries(sectionMap).forEach(([key, id]) => {
      if (s[key] === 0) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
        // Also hide corresponding nav item
        const navItem = document.querySelector(`.nav-item[data-section="${id}"]`);
        if (navItem) navItem.style.display = 'none';
      }
    });
  }
})();

