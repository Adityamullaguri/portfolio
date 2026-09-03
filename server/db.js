// server/db.js — SQLite database connection and schema setup
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Render: persistent disk is mounted at /app/data (see render.yaml).
// We store the DB there so it survives container restarts/redeploys.
// DATA_DIR env var can override for local dev (defaults to <repo>/data).
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'portfolio.db');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      site_title TEXT DEFAULT 'Aditya | Full Stack & IoT Developer',
      meta_desc TEXT DEFAULT 'Portfolio of Aditya - Full Stack, IoT & AI Developer',
      author TEXT DEFAULT 'Aditya',
      email TEXT DEFAULT 'aditya@example.com',
      favicon_url TEXT,
      logo_url TEXT,
      copyright TEXT DEFAULT '© 2026 Aditya. All rights reserved.',
      section_home INTEGER DEFAULT 1,
      section_about INTEGER DEFAULT 1,
      section_skills INTEGER DEFAULT 1,
      section_internship INTEGER DEFAULT 1,
      section_projects INTEGER DEFAULT 1,
      section_certificates INTEGER DEFAULT 1,
      section_education INTEGER DEFAULT 1,
      section_contact INTEGER DEFAULT 1,
      accent_color TEXT DEFAULT '#34d36e',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS home_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      greeting TEXT DEFAULT 'Hi, I am',
      name TEXT DEFAULT 'Aditya.',
      role_line1 TEXT DEFAULT 'Full Stack Developer',
      role_line2 TEXT DEFAULT '& IoT / AI Explorer',
      description TEXT DEFAULT 'Building intelligent, end-to-end web applications, IoT ecosystems, and interactive digital experiences with modern web technologies.',
      btn_primary_text TEXT DEFAULT 'View Projects',
      btn_primary_link TEXT DEFAULT '#projects',
      btn_secondary_text TEXT DEFAULT 'Get in Touch',
      btn_secondary_link TEXT DEFAULT '#contact',
      hero_image_light TEXT DEFAULT 'portrait.png',
      hero_image_dark TEXT DEFAULT 'portrait-dark.png',
      chips TEXT DEFAULT '["React", "Python", "Node.js", "AI / ML", "IoT", "FastAPI"]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS about_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      intro TEXT DEFAULT 'I am a passionate <span class="ab-hl">Full Stack Developer</span> and <span class="ab-hl">IoT Enthusiast</span> dedicated to bridging software with hardware.',
      bio TEXT DEFAULT '["I specialize in crafting high-performance web applications and embedded IoT solutions. With a strong background in computer science and engineering, I love tackling complex technical challenges from database architecture to microcontrollers.", "When I am not coding, you can find me exploring new AI models, contributing to open-source software, or building automated hardware prototypes."]',
      info_rows TEXT DEFAULT '[{"label":"Degree","value":"B.Tech in Computer Science"},{"label":"Specialization","value":"IoT & Embedded Systems"},{"label":"Status","value":"Open to Opportunities"},{"label":"Location","value":"India"}]',
      image1_src TEXT DEFAULT 'about-workspace.jpg',
      image1_alt TEXT DEFAULT 'Working on code',
      image1_caption TEXT DEFAULT 'Building scalable systems',
      image2_src TEXT DEFAULT 'about-dataviz.jpg',
      image2_alt TEXT DEFAULT 'Hardware tinkering',
      image2_caption TEXT DEFAULT 'IoT & Embedded Projects',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT DEFAULT 'aditya@example.com',
      phone TEXT DEFAULT '+91 98765 43210',
      location TEXT DEFAULT 'India',
      availability_text TEXT DEFAULT 'Open for freelance, collaborations, and full-time opportunities.',
      contact_desc TEXT DEFAULT 'Feel free to reach out via email or through the contact form below.',
      form_title TEXT DEFAULT 'Send a Message',
      form_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      location TEXT,
      description TEXT,
      logo_url TEXT,
      website_url TEXT,
      technologies TEXT,
      responsibilities TEXT,
      achievements TEXT,
      cert_url TEXT,
      cert_title TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_desc TEXT,
      full_desc TEXT,
      category TEXT,
      image_url TEXT,
      github_url TEXT,
      demo_url TEXT,
      tags TEXT,
      role TEXT,
      status TEXT DEFAULT 'Completed',
      badge_label TEXT DEFAULT 'Completed',
      featured INTEGER DEFAULT 0,
      published INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cert_key TEXT UNIQUE,
      issuer TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      year TEXT,
      credential_id TEXT,
      credential_url TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'Certification',
      skills_list TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS education (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      degree TEXT NOT NULL,
      institution TEXT NOT NULL,
      start_year TEXT,
      end_year TEXT,
      description TEXT,
      location TEXT,
      badge_text TEXT,
      achievements TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS social_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_svg TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS navbar_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      section_id TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      url TEXT NOT NULL,
      subfolder TEXT DEFAULT 'misc',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { getDb, initSchema };

