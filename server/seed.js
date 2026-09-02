// server/seed.js — Seeds default content and creates initial admin user
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@portfolio.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';

function seed() {
  const db = getDb();

  console.log('🌱 Seeding database...');

  // 1. Admin User
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!existingUser) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(ADMIN_EMAIL, hash, 'admin');
    console.log(`  ✓ Admin user created: ${ADMIN_EMAIL}`);
  } else {
    console.log(`  ✓ Admin user already exists: ${ADMIN_EMAIL}`);
  }

  // 2. Site Settings
  db.prepare(`
    INSERT OR IGNORE INTO site_settings (id, site_title, meta_desc, author, email, copyright, section_home, section_about, section_skills, section_internship, section_projects, section_certificates, section_education, section_contact, accent_color)
    VALUES (1, 'Aditya | Full Stack & IoT Developer', 'Portfolio of Aditya - Full Stack, IoT & AI Developer', 'Aditya', 'aditya@example.com', '© 2026 Aditya. All rights reserved.', 1, 1, 1, 1, 1, 1, 1, 1, '#34d36e')
  `).run();
  console.log('  ✓ Site settings initialized');

  // 3. Home Content
  db.prepare(`
    INSERT OR IGNORE INTO home_content (id, greeting, name, role_line1, role_line2, description, btn_primary_text, btn_primary_link, btn_secondary_text, btn_secondary_link, hero_image_light, hero_image_dark, chips)
    VALUES (1, 'Hi, I am', 'Aditya.', 'Full Stack Developer', '& IoT / AI Explorer',
      'Building intelligent, end-to-end web applications, IoT ecosystems, and interactive digital experiences with modern web technologies.',
      'View Projects', '#projects', 'Get in Touch', '#contact',
      'portrait.png', 'portrait-dark.png',
      '["React", "Python", "Node.js", "AI / ML", "IoT", "FastAPI"]')
  `).run();
  console.log('  ✓ Home content initialized');

  // 4. About Content
  db.prepare(`
    INSERT OR IGNORE INTO about_content (id, intro, bio, info_rows, image1_src, image1_alt, image1_caption, image2_src, image2_alt, image2_caption)
    VALUES (1,
      'I am a passionate <span class="ab-hl">Full Stack Developer</span> and <span class="ab-hl">IoT Enthusiast</span> dedicated to bridging software with hardware.',
      '["I specialize in crafting high-performance web applications and embedded IoT solutions. With a strong background in computer science and engineering, I love tackling complex technical challenges from database architecture to microcontrollers.", "When I am not coding, you can find me exploring new AI models, contributing to open-source software, or building automated hardware prototypes."]',
      '[{"label":"Degree","value":"B.Tech in Computer Science"},{"label":"Specialization","value":"IoT & Embedded Systems"},{"label":"Status","value":"Open to Opportunities"},{"label":"Location","value":"India"}]',
      'about-workspace.jpg', 'Working on code', 'Building scalable systems',
      'about-dataviz.jpg', 'Hardware tinkering', 'IoT & Embedded Projects')
  `).run();
  console.log('  ✓ About content initialized');

  // 5. Contact Settings
  db.prepare(`
    INSERT OR IGNORE INTO contact_settings (id, email, phone, location, availability_text, contact_desc, form_title, form_enabled)
    VALUES (1, 'aditya@example.com', '+91 98765 43210', 'India',
      'Open for freelance, collaborations, and full-time opportunities.',
      'Feel free to reach out via email or through the contact form below.',
      'Send a Message', 1)
  `).run();
  console.log('  ✓ Contact settings initialized');

  // 6. Skills
  const skillsCount = db.prepare('SELECT COUNT(*) as count FROM skills').get().count;
  if (skillsCount === 0) {
    const skills = [
      { name: 'React', category: 'Frontend', logo_url: 'assets/skills/react.svg', description: 'Building interactive and component-based web interfaces.', display_order: 0 },
      { name: 'JavaScript', category: 'Language', logo_url: 'assets/skills/javascript.svg', description: 'Modern JavaScript for interactive web applications.', display_order: 1 },
      { name: 'Python', category: 'Language', logo_url: 'assets/skills/python.svg', description: 'Python for development, automation and AI/ML.', display_order: 2 },
      { name: 'Node.js', category: 'Backend', logo_url: 'assets/skills/nodejs.svg', description: 'Building scalable backend services and APIs.', display_order: 3 },
      { name: 'HTML', category: 'Frontend', logo_url: 'assets/skills/html.svg', description: 'Semantic and accessible web structure.', display_order: 4 },
      { name: 'CSS', category: 'Frontend', logo_url: 'assets/skills/css.svg', description: 'Responsive layouts, animations and modern UI.', display_order: 5 },
      { name: 'SQL', category: 'Database', logo_url: 'assets/skills/sql.svg', description: 'Working with relational databases and queries.', display_order: 6 },
      { name: 'Git', category: 'Tools', logo_url: 'assets/skills/git.svg', description: 'Version control and collaborative development.', display_order: 7 },
      { name: 'GitHub', category: 'Tools', logo_url: 'assets/skills/github.svg', description: 'Code hosting, collaboration and project management.', display_order: 8 },
      { name: 'TensorFlow', category: 'AI / ML', logo_url: 'assets/skills/tensorflow.svg', description: 'Machine learning and AI experimentation.', display_order: 9 },
      { name: 'OpenCV', category: 'Computer Vision', logo_url: 'assets/skills/opencv.svg', description: 'Computer vision and image processing.', display_order: 10 },
      { name: 'IoT', category: 'Hardware', logo_url: 'assets/skills/iot.svg', description: 'Connected devices, sensors and intelligent systems.', display_order: 11 }
    ];
    const insertSkill = db.prepare('INSERT INTO skills (name, category, logo_url, description, display_order, active) VALUES (?, ?, ?, ?, ?, 1)');
    skills.forEach(s => insertSkill.run(s.name, s.category, s.logo_url, s.description, s.display_order));
    console.log(`  ✓ Seeded ${skills.length} skills`);
  }

  // 7. Internships
  const internCount = db.prepare('SELECT COUNT(*) as count FROM internships').get().count;
  if (internCount === 0) {
    db.prepare(`
      INSERT INTO internships (company, role, start_date, end_date, location, description, logo_url, website_url, technologies, responsibilities, achievements, cert_url, cert_title, display_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'TechCorp Solutions',
      'Software & IoT Developer Intern',
      'June 2024',
      'August 2024',
      'Remote / Hybrid',
      'Worked on embedded sensor telemetry and real-time dashboard analytics for automated agricultural monitoring.',
      'assets/company-logo.svg',
      'https://example.com',
      '["Python", "ESP32", "MQTT", "Node.js", "React", "Docker"]',
      '["Architected real-time telemetry ingestion pipelines from ESP32 microcontrollers over MQTT.", "Designed and deployed interactive React dashboards visualizing real-time environmental metrics.", "Implemented alerting algorithms triggering automated pump and light controls."]',
      '["Decreased sensor data latency by 40% using WebSocket streaming.", "Recognized with Outstanding Intern Award."]',
      'assets/internship-cert.svg',
      'Internship Certificate of Completion',
      0,
      1
    );
    console.log('  ✓ Seeded 1 internship');
  }

  // 8. Projects
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  if (projectCount === 0) {
    const projects = [
      {
        name: 'Smart Hydroponic System',
        short_desc: 'IoT-powered vertical farming platform with automated nutrient dosing and sensor telemetry.',
        full_desc: 'IoT-powered farm with real-time sensor monitoring (pH, EC, water temperature, humidity), AI plant disease detection via ESP32-CAM + Gemini Vision API, and an interactive Flask web dashboard with automated nutrient dosing.',
        category: 'IoT & AI Automation / Web Dashboard',
        image_url: 'assets/projects/smart-hydroponics.svg',
        github_url: 'https://github.com',
        demo_url: 'https://example.com',
        tags: '["Flask", "ESP32", "Gemini API", "MQTT", "Python", "C++"]',
        role: 'Full Stack / IoT Developer',
        status: 'Live Hardware Demo',
        badge_label: 'Completed',
        featured: 1,
        published: 1,
        display_order: 0
      },
      {
        name: 'Quizer — AI Quiz App',
        short_desc: 'Intelligent AI-driven exam generator and interactive learning quiz system.',
        full_desc: 'Converts PDFs, images, and raw text into interactive quizzes automatically. Features intelligent MCQ detection, OCR document parsing, editable question card builder, real-time quiz player, and student performance analytics.',
        category: 'Full Stack AI Web Application',
        image_url: 'assets/projects/quizer-ai.svg',
        github_url: 'https://github.com',
        demo_url: 'https://example.com',
        tags: '["React", "FastAPI", "Gemini AI", "Tesseract OCR", "Python", "TailwindCSS"]',
        role: 'Full Stack Engineer',
        status: 'Completed Project',
        badge_label: 'Completed',
        featured: 1,
        published: 1,
        display_order: 1
      },
      {
        name: 'Porsche GT3 RS Landing',
        short_desc: 'Cinematic 3D-feel automotive web showcase with GSAP parallax motion and HTML5 canvas engine.',
        full_desc: 'Cinematic scroll-driven automotive launch experience. Built with a custom 240-frame pre-rendered HTML5 canvas walkaround engine, GSAP parallax transitions, interactive aerodynamic callouts, and HUD-style telemetry.',
        category: 'Interactive Web / Canvas Engine',
        image_url: 'assets/projects/porsche-gt3.svg',
        github_url: 'https://github.com',
        demo_url: 'https://example.com',
        tags: '["React", "GSAP", "HTML5 Canvas", "Vite", "JavaScript", "CSS3"]',
        role: 'Frontend & Animation Specialist',
        status: 'Live Demo',
        badge_label: 'Completed',
        featured: 1,
        published: 1,
        display_order: 2
      }
    ];
    const insertProject = db.prepare(`
      INSERT INTO projects (name, short_desc, full_desc, category, image_url, github_url, demo_url, tags, role, status, badge_label, featured, published, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    projects.forEach(p => insertProject.run(p.name, p.short_desc, p.full_desc, p.category, p.image_url, p.github_url, p.demo_url, p.tags, p.role, p.status, p.badge_label, p.featured, p.published, p.display_order));
    console.log(`  ✓ Seeded ${projects.length} projects`);
  }

  // 9. Certificates
  const certCount = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
  if (certCount === 0) {
    const certs = [
      {
        cert_key: 'google-python',
        issuer: 'Google / Coursera',
        title: 'Crash Course on Python',
        description: 'Completed the Crash Course on Python certification, covering Python fundamentals, data structures, object-oriented programming, scripting techniques, and automated workflows.',
        year: '2024',
        credential_id: 'GOOG-PY-2024-8849',
        credential_url: 'https://coursera.org',
        image_url: 'assets/certificates/google-python.svg',
        category: 'Course',
        skills_list: '["Python", "OOP", "Scripting", "Data Structures"]',
        display_order: 0
      },
      {
        cert_key: 'deeplearning-ml',
        issuer: 'DeepLearning.AI',
        title: 'Machine Learning Specialization',
        description: 'Completed the 3-course Machine Learning Specialization covering supervised learning, neural networks, decision trees, and unsupervised learning algorithms.',
        year: '2024',
        credential_id: 'DLAI-ML-2024-9912',
        credential_url: 'https://coursera.org',
        image_url: 'assets/certificates/deeplearning-ml.svg',
        category: 'Specialization',
        skills_list: '["Machine Learning", "Neural Networks", "TensorFlow", "Scikit-Learn"]',
        display_order: 1
      },
      {
        cert_key: 'meta-frontend',
        issuer: 'Meta / Coursera',
        title: 'Front-End Developer Professional',
        description: 'Completed the 9-course program covering modern web development, React framework, UI/UX design principles, state management, version control, and production architecture.',
        year: '2023',
        credential_id: 'META-FE-2023-4410',
        credential_url: 'https://coursera.org',
        image_url: 'assets/certificates/meta-frontend.svg',
        category: 'Professional Certificate',
        skills_list: '["React", "JavaScript", "HTML5", "CSS3", "UI/UX"]',
        display_order: 2
      },
      {
        cert_key: 'cisco-cybersecurity',
        issuer: 'Cisco Networking Academy',
        title: 'Intro to Cybersecurity',
        description: 'Achieved student-level credential covering network security fundamentals, threat analysis, data confidentiality, encryption protocols, and operational security guidelines.',
        year: '2023',
        credential_id: 'CSCO-SEC-2023-1104',
        credential_url: 'https://netacad.com',
        image_url: 'assets/certificates/cisco-cybersecurity.svg',
        category: 'Certification',
        skills_list: '["Cybersecurity", "Network Security", "Encryption", "Threat Analysis"]',
        display_order: 3
      }
    ];
    const insertCert = db.prepare(`
      INSERT INTO certificates (cert_key, issuer, title, description, year, credential_id, credential_url, image_url, category, skills_list, display_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    certs.forEach(c => insertCert.run(c.cert_key, c.issuer, c.title, c.description, c.year, c.credential_id, c.credential_url, c.image_url, c.category, c.skills_list, c.display_order));
    console.log(`  ✓ Seeded ${certs.length} certificates`);
  }

  // 10. Education
  const eduCount = db.prepare('SELECT COUNT(*) as count FROM education').get().count;
  if (eduCount === 0) {
    const edu = [
      {
        degree: 'Bachelor of Technology in Computer Science & Engineering',
        institution: 'University Institute of Engineering & Technology',
        start_year: '2022',
        end_year: '2026',
        description: 'Specialization in IoT & Embedded Systems, Data Structures, Algorithms, Cloud Computing, and Machine Learning.',
        location: 'India',
        badge_text: 'CGPA 8.6 / 10',
        achievements: '["Data Structures & Algorithms", "Operating Systems", "IoT Architecture", "Database Management"]',
        display_order: 0
      },
      {
        degree: 'Senior Secondary Education (Class XII - CBSE)',
        institution: 'Kendriya Vidyalaya',
        start_year: '2020',
        end_year: '2022',
        description: 'Majors in Physics, Chemistry, Mathematics, and Computer Science.',
        location: 'India',
        badge_text: '92.4%',
        achievements: '["Physics", "Chemistry", "Mathematics", "Computer Science"]',
        display_order: 1
      }
    ];
    const insertEdu = db.prepare(`
      INSERT INTO education (degree, institution, start_year, end_year, description, location, badge_text, achievements, display_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    edu.forEach(e => insertEdu.run(e.degree, e.institution, e.start_year, e.end_year, e.description, e.location, e.badge_text, e.achievements, e.display_order));
    console.log(`  ✓ Seeded ${edu.length} education entries`);
  }

  // 11. Social Links
  const socialCount = db.prepare('SELECT COUNT(*) as count FROM social_links').get().count;
  if (socialCount === 0) {
    const links = [
      { platform: 'GitHub', url: 'https://github.com', display_order: 0 },
      { platform: 'LinkedIn', url: 'https://linkedin.com', display_order: 1 },
      { platform: 'Email', url: 'mailto:aditya@example.com', display_order: 2 },
      { platform: 'Resume', url: '#', display_order: 3 }
    ];
    const insertSocial = db.prepare('INSERT INTO social_links (platform, url, display_order, active) VALUES (?, ?, ?, 1)');
    links.forEach(l => insertSocial.run(l.platform, l.url, l.display_order));
    console.log(`  ✓ Seeded ${links.length} social links`);
  }

  // 12. Navbar Items
  const navCount = db.prepare('SELECT COUNT(*) as count FROM navbar_items').get().count;
  if (navCount === 0) {
    const items = [
      { label: 'Home', section_id: 'home', display_order: 0 },
      { label: 'About', section_id: 'about', display_order: 1 },
      { label: 'Skills', section_id: 'skills', display_order: 2 },
      { label: 'Experience', section_id: 'internship', display_order: 3 },
      { label: 'Projects', section_id: 'projects', display_order: 4 },
      { label: 'Certificates', section_id: 'certificates', display_order: 5 },
      { label: 'Education', section_id: 'education', display_order: 6 },
      { label: 'Contact', section_id: 'contact', display_order: 7 }
    ];
    const insertNav = db.prepare('INSERT INTO navbar_items (label, section_id, display_order, visible) VALUES (?, ?, ?, 1)');
    items.forEach(n => insertNav.run(n.label, n.section_id, n.display_order));
    console.log(`  ✓ Seeded ${items.length} navbar items`);
  }

  console.log('\n✅ Database seeded successfully!\n');
}

if (require.main === module) {
  seed();
}

module.exports = { seed };

