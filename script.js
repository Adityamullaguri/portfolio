(function(){
'use strict';
const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const isTouch=()=>window.matchMedia('(hover:none)').matches;

/* ── Theme ── */
const HTML=document.documentElement;
const toggleBtn=document.getElementById('themeToggle');
const saved=localStorage.getItem('portfolio-theme');
const sysDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
const initial=saved||(sysDark?'dark':'light');
if(initial==='dark')HTML.setAttribute('data-theme','dark');

function switchTheme(){
  if(reduced){
    // No animation for reduced-motion users — just toggle
    const next=HTML.getAttribute('data-theme')==='dark'?'light':'dark';
    if(next==='dark')HTML.setAttribute('data-theme','dark');
    else HTML.removeAttribute('data-theme');
    localStorage.setItem('portfolio-theme',next);
    return;
  }

  // 1. Snapshot the current background before the theme flips
  const oldBg=getComputedStyle(HTML).getPropertyValue('--bg').trim()||
               getComputedStyle(document.body).backgroundColor;

  // 2. Create a full-screen overlay holding the old colour
  const overlay=document.createElement('div');
  overlay.className='theme-overlay';
  overlay.style.background=oldBg;
  document.body.appendChild(overlay);

  // 3. Flip the theme immediately — new theme renders beneath the overlay
  const next=HTML.getAttribute('data-theme')==='dark'?'light':'dark';
  if(next==='dark')HTML.setAttribute('data-theme','dark');
  else HTML.removeAttribute('data-theme');
  localStorage.setItem('portfolio-theme',next);

  // 4. Toggle button micro-animation
  if(toggleBtn){toggleBtn.classList.add('pressing');setTimeout(()=>toggleBtn.classList.remove('pressing'),180);}

  // 5. Next frame: start fading the overlay out (reveals new theme)
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>overlay.classList.add('fade'));
  });

  // 6. Remove overlay after fade completes
  setTimeout(()=>overlay.remove(),700);
}
if(toggleBtn)toggleBtn.addEventListener('click',switchTheme);

/* ── Nav refs ── */
const navFloat=document.querySelector('.nav-float');
const navPill=document.getElementById('floatingNav');
const items=document.querySelectorAll('.nav-item[data-section]');
const sections=[];
items.forEach(item=>{
  const s=document.getElementById(item.dataset.section);
  if(s)sections.push({id:item.dataset.section,el:s});
});

/* ── Sliding capsule ── */
const cap=document.createElement('div');
cap.className='nav-capsule';
navPill.insertBefore(cap,navPill.firstChild);
let curActive=null;
function posCap(el){
  if(!el)return;
  const pr=navPill.getBoundingClientRect(),ir=el.getBoundingClientRect();
  cap.style.left=(ir.left-pr.left)+'px';
  cap.style.width=ir.width+'px';
}
function activate(id){
  let t=null;
  items.forEach(item=>{
    const a=item.dataset.section===id;
    item.classList.toggle('active',a);
    item.setAttribute('aria-current',a?'page':'false');
    if(a)t=item;
  });
  if(t&&t!==curActive){posCap(t);curActive=t;}
}

/* ── Entrance ── */
if(!reduced){
  requestAnimationFrame(()=>requestAnimationFrame(()=>navFloat.classList.add('nav-visible')));
}else{
  navFloat.style.cssText='transform:translateX(-50%);opacity:1;transition:none';
}

/* ── Init capsule ── */
window.addEventListener('load',()=>{
  const first=document.querySelector('.nav-item.active');
  if(first){cap.style.transition='none';posCap(first);curActive=first;requestAnimationFrame(()=>cap.style.transition='');}
});
new ResizeObserver(()=>{
  if(curActive){cap.style.transition='none';posCap(curActive);requestAnimationFrame(()=>cap.style.transition='');}
}).observe(navPill);

/* ── Scroll spy ── */
const ratios=new Map();
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>ratios.set(e.target.id,e.intersectionRatio));
  let best=null,br=-1;
  sections.forEach(({id})=>{const r=ratios.get(id)??0;if(r>br){br=r;best=id;}});
  if(best)activate(best);
},{threshold:Array.from({length:21},(_,i)=>i/20),rootMargin:'0px 0px -10% 0px'});
sections.forEach(({el})=>io.observe(el));

/* ── Scroll depth ── */
let st;
window.addEventListener('scroll',()=>{
  if(reduced)return;
  navFloat.classList.add('nav-scrolling');
  clearTimeout(st);
  st=setTimeout(()=>navFloat.classList.remove('nav-scrolling'),600);
},{passive:true});

/* ── Click ── */
items.forEach(item=>{
  item.addEventListener('click',e=>{
    e.preventDefault();
    const s=document.getElementById(item.dataset.section);
    if(!s)return;
    if(!reduced){item.classList.add('pressing');setTimeout(()=>item.classList.remove('pressing'),220);}
    activate(item.dataset.section);
    s.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  });
});

/* ── Magnetic (desktop only) ── */
if(!isTouch()&&!reduced){
  items.forEach(item=>{
    let raf;
    item.addEventListener('mousemove',e=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const r=item.getBoundingClientRect();
        const mx=(e.clientX-r.left-r.width/2)/(r.width/2)*2;
        const my=(e.clientY-r.top-r.height/2)/(r.height/2)*1.2;
        item.style.transform=`translate(${mx}px,calc(-2px + ${my}px))`;
      });
    });
    item.addEventListener('mouseleave',()=>{cancelAnimationFrame(raf);item.style.transform='';});
  });
}

/* ── Section reveal ── */
const rv=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');});
},{threshold:.1});
window._portfolioRV = rv;
document.querySelectorAll('[data-r]').forEach(el=>rv.observe(el));

/* ══════════════════════════════════════
   HERO: Entry Animation
══════════════════════════════════════ */
(function heroEntry(){
  const elems=document.querySelectorAll('.h-anim');
  if(!elems.length)return;

  if(reduced){
    // If reduced motion: show immediately, no animation
    elems.forEach(el=>el.classList.add('h-vis'));
    return;
  }

  // Trigger after one frame so CSS transitions are active
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    elems.forEach(el=>el.classList.add('h-vis'));
  }));
})();

/* ══════════════════════════════════════
   HERO: Mouse Parallax (desktop only)
══════════════════════════════════════ */
(function heroParallax(){
  if(isTouch()||reduced)return;

  const frame=document.getElementById('heroPortraitFrame');
  if(!frame)return;

  const MAX_SHIFT=6;   // px
  const MAX_ROT=0.8;   // deg

  let raf,tx=0,ty=0,rx=0,ry=0;
  let targetTx=0,targetTy=0,targetRx=0,targetRy=0;

  window.addEventListener('mousemove',e=>{
    const cx=window.innerWidth/2;
    const cy=window.innerHeight/2;
    const nx=(e.clientX-cx)/cx;   // -1 to 1
    const ny=(e.clientY-cy)/cy;

    targetTx=nx*MAX_SHIFT;
    targetTy=ny*(MAX_SHIFT*.65);
    targetRx=-ny*MAX_ROT;
    targetRy=nx*MAX_ROT;
  },{passive:true});

  // Lerp loop
  function lerp(a,b,t){return a+(b-a)*t}
  const EASE=0.072;

  function tick(){
    tx=lerp(tx,targetTx,EASE);
    ty=lerp(ty,targetTy,EASE);
    rx=lerp(rx,targetRx,EASE);
    ry=lerp(ry,targetRy,EASE);

    frame.style.transform=
      `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) `+
      `rotateX(${rx.toFixed(3)}deg) `+
      `rotateY(${ry.toFixed(3)}deg)`;

    raf=requestAnimationFrame(tick);
  }

  const heroEl=document.getElementById('home');
  // Only run parallax while hero is visible
  const heroObs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        if(!raf)raf=requestAnimationFrame(tick);
      }else{
        if(raf){cancelAnimationFrame(raf);raf=null;}
        // reset position
        tx=ty=rx=ry=0;
        targetTx=targetTy=targetRx=targetRy=0;
        frame.style.transform='';
      }
    });
  },{threshold:0.1});
  if(heroEl)heroObs.observe(heroEl);
})();

/* ══════════════════════════════════════
   HERO: Scroll Parallax / Fade-out
══════════════════════════════════════ */
(function heroScrollFx(){
  if(reduced)return;

  const heroSec=document.getElementById('home');
  const heroLeft=document.querySelector('.hero-left');
  const heroRight=document.querySelector('.hero-right');
  if(!heroSec||!heroLeft||!heroRight)return;

  function onScroll(){
    const scrollY=window.scrollY;
    const heroH=heroSec.offsetHeight;

    if(scrollY<=0){
      heroLeft.style.transform='';
      heroLeft.style.opacity='';
      heroRight.style.transform='';
      heroRight.style.opacity='';
      return;
    }

    const ratio=Math.min(scrollY/heroH,1);  // 0 → 1
    if(ratio>0.55)return; // stop after hero fully gone

    // Left: fade + slide up gently
    const leftY=ratio*30;
    const leftOp=1-ratio*1.5;
    heroLeft.style.transform=`translateY(-${leftY.toFixed(1)}px)`;
    heroLeft.style.opacity=Math.max(leftOp,0).toFixed(3);

    // Right: portrait slides up slightly
    const rightY=ratio*18;
    heroRight.style.transform=`translateY(-${rightY.toFixed(1)}px)`;
  }

  window.addEventListener('scroll',onScroll,{passive:true});
})();

/* ══════════════════════════════════════
   SKILLS SECTION: RADIAL CAROUSEL
══════════════════════════════════════ */
(function initSkillRadialCarousel() {
  const skills = (window.__PD && window.__PD.skills && window.__PD.skills.length)
    ? window.__PD.skills
    : [
    {
      id: "react",
      name: "React",
      category: "Frontend",
      logo: "assets/skills/react.svg",
      description: "Building interactive and component-based web interfaces."
    },
    {
      id: "javascript",
      name: "JavaScript",
      category: "Language",
      logo: "assets/skills/javascript.svg",
      description: "Modern JavaScript for interactive web applications."
    },
    {
      id: "python",
      name: "Python",
      category: "Language",
      logo: "assets/skills/python.svg",
      description: "Python for development, automation and AI/ML."
    },
    {
      id: "node",
      name: "Node.js",
      category: "Backend",
      logo: "assets/skills/nodejs.svg",
      description: "Building scalable backend services and APIs."
    },
    {
      id: "html",
      name: "HTML",
      category: "Frontend",
      logo: "assets/skills/html.svg",
      description: "Semantic and accessible web structure."
    },
    {
      id: "css",
      name: "CSS",
      category: "Frontend",
      logo: "assets/skills/css.svg",
      description: "Responsive layouts, animations and modern UI."
    },
    {
      id: "sql",
      name: "SQL",
      category: "Database",
      logo: "assets/skills/sql.svg",
      description: "Working with relational databases and queries."
    },
    {
      id: "git",
      name: "Git",
      category: "Tools",
      logo: "assets/skills/git.svg",
      description: "Version control and collaborative development."
    },
    {
      id: "github",
      name: "GitHub",
      category: "Tools",
      logo: "assets/skills/github.svg",
      description: "Code hosting, collaboration and project management."
    },
    {
      id: "tensorflow",
      name: "TensorFlow",
      category: "AI / ML",
      logo: "assets/skills/tensorflow.svg",
      description: "Machine learning and AI experimentation."
    },
    {
      id: "opencv",
      name: "OpenCV",
      category: "Computer Vision",
      logo: "assets/skills/opencv.svg",
      description: "Computer vision and image processing."
    },
    {
      id: "iot",
      name: "IoT",
      category: "Hardware",
      logo: "assets/skills/iot.svg",
      description: "Connected devices, sensors and intelligent systems."
    }
  ];

  const wrapper = document.getElementById('radialSkillCarousel');
  const orbitContainer = document.getElementById('radialOrbitContainer');
  const centerCard = document.getElementById('skillCenterCard');
  const centerLogo = document.getElementById('centerSkillLogo');
  const centerName = document.getElementById('centerSkillName');
  const centerCat = document.getElementById('centerSkillCat');
  const centerDesc = document.getElementById('centerSkillDesc');

  if (!wrapper || !orbitContainer || !centerCard) return;

  let activeIndex = 0;
  let currentAngle = 0;
  let targetAngle = 0;
  let velocity = 0;
  let isDragging = false;
  let startX = 0;
  let lastX = 0;
  let lastTime = 0;
  let animFrameId = null;

  const totalItems = skills.length;
  const angleStep = (2 * Math.PI) / totalItems;

  const itemElements = skills.map((skill, index) => {
    const el = document.createElement('div');
    el.className = `radial-item ${index === 0 ? 'active' : ''}`;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `View ${skill.name} skill`);
    el.setAttribute('data-index', index);

    const img = document.createElement('img');
    img.src = skill.logo;
    img.alt = skill.name;
    img.className = 'radial-item-logo';

    el.appendChild(img);
    orbitContainer.appendChild(el);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSkill(index);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSkill(index);
      }
    });

    return el;
  });

  function getRadius() {
    const w = window.innerWidth;
    if (w >= 992) return 205;
    if (w >= 640) return 165;
    if (w >= 420) return 115;
    return 95;
  }

  function renderLayout() {
    const radius = getRadius();
    const centerX = 0;
    const centerY = 0;

    itemElements.forEach((el, index) => {
      const itemAngle = currentAngle + index * angleStep;
      const x = centerX + radius * Math.cos(itemAngle);
      const y = centerY + radius * Math.sin(itemAngle);
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
  }

  function tick() {
    if (!isDragging) {
      if (Math.abs(velocity) > 0.0001) {
        currentAngle += velocity;
        velocity *= 0.92;
      } else {
        const diff = targetAngle - currentAngle;
        currentAngle += diff * 0.12;
      }
    }

    renderLayout();
    animFrameId = requestAnimationFrame(tick);
  }

  function selectSkill(index) {
    if (index === activeIndex) return;

    activeIndex = index;
    const skill = skills[activeIndex];

    itemElements.forEach((el, idx) => {
      el.classList.toggle('active', idx === activeIndex);
    });

    const desiredTarget = -index * angleStep;
    let diff = (desiredTarget - currentAngle) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    targetAngle = currentAngle + diff;

    centerCard.classList.remove('skill-card-pop');
    void centerCard.offsetWidth;
    centerCard.classList.add('skill-card-pop');

    centerLogo.src = skill.logo;
    centerLogo.alt = skill.name;
    centerName.textContent = skill.name;
    centerCat.textContent = skill.category;
    centerDesc.textContent = skill.description;
  }

  function onPointerDown(e) {
    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    lastX = startX;
    lastTime = performance.now();
    velocity = 0;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = clientX - lastX;
    const now = performance.now();
    const dt = now - lastTime || 16;

    const radiansMoved = (deltaX / getRadius()) * 0.85;
    currentAngle += radiansMoved;
    targetAngle = currentAngle;
    velocity = radiansMoved / (dt / 16);

    lastX = clientX;
    lastTime = now;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;

    if (Math.abs(velocity) < 0.05) {
      let normAngle = (-currentAngle) % (2 * Math.PI);
      if (normAngle < 0) normAngle += 2 * Math.PI;
      let nearestIdx = Math.round(normAngle / angleStep) % totalItems;
      selectSkill(nearestIdx);
    }
  }

  wrapper.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  wrapper.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);

  window.addEventListener('resize', renderLayout);

  renderLayout();
  animFrameId = requestAnimationFrame(tick);
})();
/* ══════════════════════════════════════
   CERTIFICATES: Carousel Navigation
   Controls which certificate is shown in
   the large .epc-card-main slot.
   Completely separate from the FLIP morph
   handled by initExpandableCards below.
══════════════════════════════════════ */
(function initCertCarousel() {

  const CERTS_DATA = (window.__PD && window.__PD.certsData && window.__PD.certsData.length)
    ? window.__PD.certsData
    : [
    {
      id: 'google-python',
      imageSrc: 'assets/certificates/google-python.svg',
      title: 'Crash Course on Python',
      issuer: 'Google / Coursera',
      alt: 'Crash Course on Python',
      ariaLabel: 'View Google Crash Course on Python certificate details'
    },
    {
      id: 'deeplearning-ml',
      imageSrc: 'assets/certificates/deeplearning-ml.svg',
      title: 'Machine Learning Specialization',
      issuer: 'DeepLearning.AI',
      alt: 'Machine Learning Specialization',
      ariaLabel: 'View Machine Learning Specialization certificate details'
    },
    {
      id: 'meta-frontend',
      imageSrc: 'assets/certificates/meta-frontend.svg',
      title: 'Front-End Developer Professional',
      issuer: 'Meta / Coursera',
      alt: 'Front-End Developer Professional Certificate',
      ariaLabel: 'View Meta Front-End Developer certificate details'
    },
    {
      id: 'cisco-cybersecurity',
      imageSrc: 'assets/certificates/cisco-cybersecurity.svg',
      title: 'Intro to Cybersecurity',
      issuer: 'Cisco Networking Academy',
      alt: 'Intro to Cybersecurity Certificate',
      ariaLabel: 'View Cisco Intro to Cybersecurity certificate details'
    }
  ];

  const mainCard   = document.getElementById('certMainCard');
  const mainImg    = document.getElementById('certMainImg');
  const mainIssuer = document.getElementById('certMainIssuer');
  const mainTitle  = document.getElementById('certMainTitle');
  const mainWrap   = document.getElementById('certMainWrap');
  const prevBtn    = document.getElementById('certPrevBtn');
  const nextBtn    = document.getElementById('certNextBtn');
  const thumbBtns  = document.querySelectorAll('.cert-thumb');

  if (!mainCard || !mainImg || !mainWrap) return;

  const N = CERTS_DATA.length;
  let selectedIdx = 0;
  let isChanging  = false;

  function isExpandedOpen() {
    const exp = document.getElementById('epcExpanded');
    return exp && exp.classList.contains('active');
  }

  function updateThumbs() {
    thumbBtns.forEach((btn, i) => {
      const active = (i === selectedIdx);
      btn.classList.toggle('cert-thumb-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function swapCard(idx) {
    const c = CERTS_DATA[idx];
    mainImg.src              = c.imageSrc;
    mainImg.alt              = c.alt;
    mainIssuer.textContent   = c.issuer;
    mainTitle.textContent    = c.title;
    mainCard.dataset.certId  = c.id;
    mainCard.setAttribute('aria-label', c.ariaLabel);
  }

  function goTo(idx) {
    if (isChanging || isExpandedOpen()) return;
    const next = ((idx % N) + N) % N;
    if (next === selectedIdx) return;

    isChanging = true;

    /* Fade out */
    mainWrap.classList.add('cert-fading');

    setTimeout(() => {
      selectedIdx = next;
      swapCard(selectedIdx);
      updateThumbs();

      /* Fade in — remove class to restore opacity via transition */
      mainWrap.classList.remove('cert-fading');

      setTimeout(() => { isChanging = false; }, 220);
    }, 200);
  }

  /* Arrow buttons — stopPropagation prevents .epc-card click handler */
  if (prevBtn) prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goTo(selectedIdx - 1);
  });
  if (nextBtn) nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    goTo(selectedIdx + 1);
  });

  /* Thumbnail clicks */
  thumbBtns.forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo(i);
    });
  });

  /* Keyboard arrows (disabled while expanded card is open) */
  document.addEventListener('keydown', (e) => {
    if (isExpandedOpen()) return;
    /* Only fire when focus isn't on a form element */
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(selectedIdx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(selectedIdx + 1); }
  });

})();

/* ══════════════════════════════════════
   CERTIFICATES: Expandable Profile Card
   (Watermelon ExpandableProfileCard pattern)
   FLIP morph: ghost flies card → center,
   expanded panel fades in, closes in reverse.
══════════════════════════════════════ */
(function initExpandableCards() {
  const CERTS = (window.__PD && window.__PD.certs && Object.keys(window.__PD.certs).length)
    ? window.__PD.certs
    : {
    'google-python': {
      imageSrc: 'assets/certificates/google-python.svg',
      title: 'Crash Course on Python',
      issuer: 'Google / Coursera',
      category: 'Course',
      year: '2024',
      description: 'Completed the Crash Course on Python certification, covering Python fundamentals, data structures, object-oriented programming, scripting techniques, and automated workflows.',
      credentialId: 'GOOG-PY-2024-8849'
    },
    'deeplearning-ml': {
      imageSrc: 'assets/certificates/deeplearning-ml.svg',
      title: 'Machine Learning Specialization',
      issuer: 'DeepLearning.AI',
      category: 'Specialization',
      year: '2024',
      description: 'Completed the 3-course Machine Learning Specialization covering supervised learning, neural networks, decision trees, and unsupervised learning algorithms.',
      credentialId: 'DLAI-ML-2024-9912'
    },
    'meta-frontend': {
      imageSrc: 'assets/certificates/meta-frontend.svg',
      title: 'Front-End Developer Professional',
      issuer: 'Meta / Coursera',
      category: 'Professional Certificate',
      year: '2023',
      description: 'Completed the 9-course program covering modern web development, React framework, UI/UX design principles, state management, version control, and production architecture.',
      credentialId: 'META-FE-2023-4410'
    },
    'cisco-cybersecurity': {
      imageSrc: 'assets/certificates/cisco-cybersecurity.svg',
      title: 'Intro to Cybersecurity',
      issuer: 'Cisco Networking Academy',
      category: 'Certification',
      year: '2023',
      description: 'Achieved student-level credential covering network security fundamentals, threat analysis, data confidentiality, encryption protocols, and operational security guidelines.',
      credentialId: 'CSCO-SEC-2023-1104'
    }
  };

  const ghost     = document.getElementById('epcMorphGhost');
  const backdrop  = document.getElementById('epcBackdrop');
  const expanded  = document.getElementById('epcExpanded');
  const expBody   = expanded ? expanded.querySelector('.epc-exp-body') : null;
  const closeBtn  = document.getElementById('epcExpandedClose');
  const expImg    = document.getElementById('epcExpImg');
  const expCat    = document.getElementById('epcExpCategory');
  const expIssuer = document.getElementById('epcExpIssuer');
  const expTitle  = document.getElementById('epcExpTitle');
  const expDesc   = document.getElementById('epcExpDesc');
  const metaIssuer= document.getElementById('epcExpMetaIssuer');
  const metaDate  = document.getElementById('epcExpMetaDate');
  const metaCat   = document.getElementById('epcExpMetaCategory');
  const metaCred  = document.getElementById('epcExpMetaCred');
  const viewBtn   = document.getElementById('epcViewCertBtn');
  const viewer    = document.getElementById('certViewer');
  const viewerImg = document.getElementById('certViewerImg');
  const viewerClose    = document.getElementById('certViewerClose');
  const viewerBackdrop = document.getElementById('certViewerBackdrop');

  if (!ghost || !backdrop || !expanded || !expBody) return;

  let activeCard = null;
  let activeCert = null;
  let isOpen     = false;
  let isAnimating= false;
  const DUR  = 460;
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  /* Build ghost interior */
  const ghostImg  = document.createElement('img');
  ghostImg.alt    = '';
  ghostImg.setAttribute('aria-hidden', 'true');
  ghostImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
  const ghostGrad = document.createElement('div');
  ghostGrad.className = 'epc-grad';
  ghost.appendChild(ghostImg);
  ghost.appendChild(ghostGrad);

  function setGhostPos(r) {
    ghost.style.left   = r.left   + 'px';
    ghost.style.top    = r.top    + 'px';
    ghost.style.width  = r.width  + 'px';
    ghost.style.height = r.height + 'px';
  }

  function getCenterRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W  = Math.min(940, vw - 48);
    const H  = Math.min(expBody.scrollHeight || 560, vh * 0.80);
    return { left:(vw-W)/2, top:(vh-H)/2, width:W, height:H };
  }

  function fillExpanded(d) {
    if (expImg)     expImg.src            = d.imageSrc;
    if (expCat)     expCat.textContent    = d.category.toUpperCase();
    if (expIssuer)  expIssuer.textContent = d.issuer;
    if (expTitle)   expTitle.textContent  = d.title;
    if (expDesc)    expDesc.textContent   = d.description;
    if (metaIssuer) metaIssuer.textContent= d.issuer;
    if (metaDate)   metaDate.textContent  = d.year;
    if (metaCat)    metaCat.textContent   = d.category;
    if (metaCred)   metaCred.textContent  = d.credentialId;
  }

  /* OPEN */
  function openCard(card, id) {
    if (isAnimating || isOpen) return;
    const data = CERTS[id];
    if (!data) return;
    isAnimating = true;
    activeCard = card;
    activeCert = data;

    fillExpanded(data);
    const src = card.getBoundingClientRect();

    ghostImg.src = data.imageSrc;
    setGhostPos(src);
    ghost.style.borderRadius = '20px';
    ghost.style.transition   = 'none';
    ghost.style.opacity      = '1';
    ghost.style.visibility   = 'visible';

    card.classList.add('epc-morph-source');
    backdrop.style.transition = 'opacity ' + DUR + 'ms ' + EASE;
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    /* Show expanded (but expBody starts at opacity 0 per CSS) */
    expanded.setAttribute('aria-hidden', 'false');
    expanded.classList.add('active');

    requestAnimationFrame(() => {
      const tgt = getCenterRect();
      ghost.style.transition =
        'left '          + DUR + 'ms ' + EASE + ', ' +
        'top '           + DUR + 'ms ' + EASE + ', ' +
        'width '         + DUR + 'ms ' + EASE + ', ' +
        'height '        + DUR + 'ms ' + EASE + ', ' +
        'border-radius ' + DUR + 'ms ' + EASE;
      setGhostPos(tgt);
      ghost.style.borderRadius = '28px';

      setTimeout(() => {
        ghost.style.transition = 'opacity 120ms ease';
        ghost.style.opacity    = '0';
        setTimeout(() => {
          ghost.style.visibility = 'hidden';
          isAnimating = false;
          isOpen = true;
          if (closeBtn) closeBtn.focus();
        }, 130);
      }, DUR);
    });
  }

  /* CLOSE */
  function closeCard() {
    if (isAnimating || !isOpen) return;
    if (!activeCard) { forcedClose(); return; }
    isAnimating = true;
    isOpen = false;

    const tgt    = getCenterRect();
    const srcR   = activeCard.getBoundingClientRect();

    ghostImg.src             = activeCert ? activeCert.imageSrc : '';
    ghost.style.transition   = 'none';
    setGhostPos(tgt);
    ghost.style.borderRadius = '28px';
    ghost.style.opacity      = '0';
    ghost.style.visibility   = 'visible';

    /* hide real panel immediately */
    expBody.style.transition = 'opacity 80ms ease, transform 80ms ease';
    expBody.style.opacity    = '0';
    expBody.style.transform  = 'scale(1)';

    requestAnimationFrame(() => {
      ghost.style.transition = 'opacity 80ms ease';
      ghost.style.opacity    = '1';
      requestAnimationFrame(() => {
        ghost.style.transition =
          'left '          + DUR + 'ms ' + EASE + ', ' +
          'top '           + DUR + 'ms ' + EASE + ', ' +
          'width '         + DUR + 'ms ' + EASE + ', ' +
          'height '        + DUR + 'ms ' + EASE + ', ' +
          'border-radius ' + DUR + 'ms ' + EASE + ', ' +
          'opacity 80ms '  + (DUR - 80) + 'ms ease';
        setGhostPos(srcR);
        ghost.style.borderRadius = '20px';
        ghost.style.opacity      = '0';
        backdrop.style.transition = 'opacity ' + DUR + 'ms ' + EASE;
        backdrop.classList.remove('active');

        setTimeout(() => {
          ghost.style.visibility = 'hidden';
          ghost.style.transition = '';
          expanded.classList.remove('active');
          expanded.setAttribute('aria-hidden', 'true');
          expBody.style.transition = '';
          expBody.style.opacity    = '';
          expBody.style.transform  = '';
          document.body.style.overflow = '';
          activeCard.classList.remove('epc-morph-source');
          activeCard  = null;
          activeCert  = null;
          isAnimating = false;
        }, DUR + 20);
      });
    });
  }

  function forcedClose() {
    expanded.classList.remove('active');
    expanded.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('active');
    ghost.style.visibility = 'hidden';
    ghost.style.opacity    = '0';
    document.body.style.overflow = '';
    if (activeCard) activeCard.classList.remove('epc-morph-source');
    activeCard = activeCert = null;
    isOpen = isAnimating = false;
  }

  /* Card click */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.epc-card');
    if (card && card.dataset.certId) openCard(card, card.dataset.certId);
  });
  /* Card keyboard */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.epc-card');
      if (card && card.dataset.certId) { e.preventDefault(); openCard(card, card.dataset.certId); }
    }
  });
  /* Close button */
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeCard(); });
  /* Backdrop */
  if (backdrop) backdrop.addEventListener('click', closeCard);
  /* Escape */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (viewer && viewer.classList.contains('active')) closeCertViewer();
    else if (isOpen) closeCard();
  });

  /* Full-screen certificate viewer */
  function openCertViewer() {
    if (!viewer || !activeCert) return;
    viewerImg.src = activeCert.imageSrc;
    viewer.classList.add('active');
    viewer.setAttribute('aria-hidden', 'false');
    if (viewerClose) viewerClose.focus();
  }
  function closeCertViewer() {
    if (!viewer) return;
    viewer.classList.remove('active');
    viewer.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (viewerImg) viewerImg.src = ''; }, 300);
  }
  if (viewBtn)          viewBtn.addEventListener('click', (e) => { e.stopPropagation(); openCertViewer(); });
  if (viewerClose)      viewerClose.addEventListener('click', (e) => { e.stopPropagation(); closeCertViewer(); });
  if (viewerBackdrop)   viewerBackdrop.addEventListener('click', closeCertViewer);

  /* Internship cert modal (preserved) */
  const iModal  = document.getElementById('certModal');
  const iClose  = document.getElementById('certModalClose');
  const iImg    = document.getElementById('certModalImg');
  const iObj    = document.getElementById('certModalObj');
  const iPdf    = document.getElementById('certModalPdf');
  function openICert(src, role, company, type) {
    const rEl = document.getElementById('certModalRole');
    const cEl = document.getElementById('certModalCompany');
    if (rEl) rEl.textContent = role    || '';
    if (cEl) cEl.textContent = company || '';
    if (iImg) { iImg.style.display='none'; iImg.src=''; }
    if (iObj) { iObj.style.display='none'; iObj.data=''; }
    if (iPdf) { iPdf.style.display='none'; iPdf.src=''; }
    const low = (src||'').toLowerCase();
    if      (low.endsWith('.pdf')||type==='pdf') { if(iPdf){iPdf.src=src;iPdf.style.display='block';} }
    else if (low.endsWith('.svg')||type==='svg') { if(iObj){iObj.data=src;iObj.style.display='block';} }
    else                                          { if(iImg){iImg.src=src;iImg.style.display='block';} }
    if (iModal) { iModal.classList.add('active'); iModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  }
  function closeICert() {
    if (!iModal) return;
    iModal.classList.remove('active'); iModal.setAttribute('aria-hidden','true'); document.body.style.overflow='';
    setTimeout(()=>{ if(iImg)iImg.src=''; if(iPdf)iPdf.src=''; if(iObj)iObj.data=''; }, 320);
  }
  if (iClose)  iClose.addEventListener('click', closeICert);
  if (iModal)  iModal.addEventListener('click', (e)=>{ if(e.target===iModal) closeICert(); });
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.exp-cert-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    openICert(btn.dataset.cert, btn.dataset.role, btn.dataset.company, btn.dataset.certType);
  });
  window.addEventListener('keydown', (e)=>{
    if (e.key==='Escape' && iModal && iModal.classList.contains('active')) closeICert();
  });
})();

/* ══════════════════════════════════════
   PROJECTS: Card Menus & Project Details Modal
══════════════════════════════════════ */
(function initProjectSystem() {
  const projectsData = (window.__PD && window.__PD.projects && Object.keys(window.__PD.projects).length)
    ? window.__PD.projects
    : {
    "smart-hydroponics": {
      title: "Smart Hydroponic System",
      category: "IoT & AI Automation / Web Dashboard",
      role: "Full Stack / IoT Developer",
      status: "Live Hardware Demo",
      image: "assets/projects/smart-hydroponics.svg",
      description: "IoT-powered farm with real-time sensor monitoring (pH, EC, water temperature, humidity), AI plant disease detection via ESP32-CAM + Gemini Vision API, and an interactive Flask web dashboard with automated nutrient dosing.",
      tags: ["Flask", "ESP32", "Gemini API", "MQTT", "Python", "C++"]
    },
    "quizer": {
      title: "Quizer — AI Quiz App",
      category: "Full Stack AI Web Application",
      role: "Full Stack Engineer",
      status: "Completed Project",
      image: "assets/projects/quizer-ai.svg",
      description: "Converts PDFs, images, and raw text into interactive quizzes automatically. Features intelligent MCQ detection, OCR document parsing, editable question card builder, real-time quiz player, and student performance analytics.",
      tags: ["React", "FastAPI", "Gemini AI", "Tesseract OCR", "Python", "TailwindCSS"]
    },
    "porsche-gt3": {
      title: "Porsche GT3 RS Landing",
      category: "Interactive Web / Canvas Engine",
      role: "Frontend & Animation Specialist",
      status: "Live Demo",
      image: "assets/projects/porsche-gt3.svg",
      description: "Cinematic scroll-driven automotive launch experience. Built with a custom 240-frame pre-rendered HTML5 canvas walkaround engine, GSAP parallax transitions, interactive aerodynamic callouts, and HUD-style telemetry.",
      tags: ["React", "GSAP", "HTML5 Canvas", "Vite", "JavaScript", "CSS3"]
    }
  };

  // 1. Three-Dot Dropdown Toggles
  document.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.prj-menu-btn');
    const allDropdowns = document.querySelectorAll('.prj-dropdown');

    if (menuBtn) {
      e.stopPropagation();
      const wrap = menuBtn.closest('.prj-menu-wrap');
      const dropdown = wrap ? wrap.querySelector('.prj-dropdown') : null;
      allDropdowns.forEach(d => { if (d !== dropdown) d.classList.remove('active'); });
      if (dropdown) dropdown.classList.toggle('active');
    } else {
      allDropdowns.forEach(d => d.classList.remove('active'));
    }
  });

  // 2. Project Modal System
  const modal = document.getElementById('prjModal');
  const closeBtn = document.getElementById('prjModalClose');
  const titleEl = document.getElementById('prjModalTitle');
  const catEl = document.getElementById('prjModalCategory');
  const imgEl = document.getElementById('prjModalImg');
  const descEl = document.getElementById('prjModalDesc');
  const roleEl = document.getElementById('prjModalRole');
  const statusEl = document.getElementById('prjModalStatus');
  const tagsEl = document.getElementById('prjModalTags');

  if (!modal) return;

  function openProjectModal(id) {
    const prj = projectsData[id];
    if (!prj) return;

    if (titleEl) titleEl.textContent = prj.title;
    if (catEl) catEl.textContent = prj.category;
    if (imgEl) imgEl.src = prj.image;
    if (descEl) descEl.textContent = prj.description;
    if (roleEl) roleEl.textContent = prj.role;
    if (statusEl) statusEl.textContent = prj.status;

    if (tagsEl) {
      tagsEl.innerHTML = '';
      prj.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'tg';
        span.textContent = t;
        tagsEl.appendChild(span);
      });
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (closeBtn) closeBtn.focus();
  }

  function closeProjectModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.open-prj-modal');
    if (trigger) {
      e.preventDefault();
      const id = trigger.getAttribute('data-id');
      if (id) openProjectModal(id);
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeProjectModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeProjectModal(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeProjectModal();
  });
})();

/* ══════════════════════════════════════
   EDUCATION: Scroll-Driven Timeline Controller
   Directly controls progress line, dots,
   and cards based on user scroll position.
   Zero timers. Zero delays. Zero auto-play.
══════════════════════════════════════ */
(function initEduTimeline() {
  const section = document.getElementById('education');
  const progressLine = document.getElementById('eduTimelineProgress');
  const items = document.querySelectorAll('.edu-item');
  if (!section || !items.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    if (progressLine) progressLine.style.height = '100%';
    items.forEach(item => {
      const dot = item.querySelector('.edu-dot');
      const card = item.querySelector('.edu-card');
      if (dot) dot.classList.add('active');
      if (card) card.classList.add('visible');
    });
    return;
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];

  let rafId = null;

  function updateScrollProgress() {
    rafId = null;

    const vh = window.innerHeight;
    const firstRect = firstItem.getBoundingClientRect();
    const lastRect = lastItem.getBoundingClientRect();

    // Trigger viewport heights:
    // First item activates when its top reaches ~75% of viewport height
    const triggerStart = vh * 0.75;
    // Last item activates when its top reaches ~50% of viewport height
    const triggerEnd = vh * 0.50;

    const maxLineHeight = lastItem.offsetTop - firstItem.offsetTop;

    let rawProgress = 0;
    if (firstRect.top <= triggerStart) {
      if (lastRect.top <= triggerEnd) {
        rawProgress = 1;
      } else {
        const scrolled = triggerStart - firstRect.top;
        const totalScrollable = (triggerStart - triggerEnd) + maxLineHeight;
        rawProgress = scrolled / (totalScrollable || 1);
      }
    }
    rawProgress = Math.max(0, Math.min(1, rawProgress));

    const currentLineHeight = rawProgress * maxLineHeight;
    if (progressLine) {
      progressLine.style.height = `${currentLineHeight}px`;
    }

    // Update dot and card visibility per item based on scroll position
    items.forEach((item, idx) => {
      const dot = item.querySelector('.edu-dot');
      const card = item.querySelector('.edu-card');
      const itemOffset = item.offsetTop - firstItem.offsetTop;

      // Item is active if progress line reaches its vertical offset or item top is above trigger threshold
      const itemRect = item.getBoundingClientRect();
      const isReached = (currentLineHeight >= itemOffset - 4) || (itemRect.top <= triggerStart);

      if (dot) {
        if (isReached) {
          if (!dot.classList.contains('active')) {
            dot.classList.add('active', 'pulse');
            setTimeout(() => dot.classList.remove('pulse'), 450);
          }
        } else {
          dot.classList.remove('active', 'pulse');
        }
      }

      if (card) {
        if (isReached) {
          card.classList.add('visible');
        } else {
          card.classList.remove('visible');
        }
      }
    });
  }

  function onScroll() {
    if (!rafId) {
      rafId = requestAnimationFrame(updateScrollProgress);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial calculation on load
  updateScrollProgress();
})();

}());

