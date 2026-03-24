// ── Load environment variables first ─────────────────
require('dotenv').config();

const express = require('express');
const path    = require('path');
const connectDB = require('./config/db');

// ── Connect to MongoDB ────────────────────────────────
connectDB();

// ── Create Express app ────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────
app.use(express.json());                          // parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // parse form data

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded profile images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── View engine ───────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Routes ────────────────────────────────────────────

// Admin API: /admin/login, /admin/clients, etc.
app.use('/admin', require('./routes/admin'));

// Public client pages: /username
app.use('/', require('./routes/client'));

// ── Health check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start server ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
// ── 404 Handler (ADD THIS AT THE END) ──────────────────
app.use((req, res) => {
  res.status(404).render('404');
});
app.listen(PORT, () => {
  console.log(`\n🚀 LinkPage server running at http://localhost:${PORT}`);
  console.log(`📋 Admin API:   http://localhost:${PORT}/admin`);
  console.log(`🌐 Client page: http://localhost:${PORT}/:username\n`);
});