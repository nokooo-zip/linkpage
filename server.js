// ── Load environment variables first ──────────────────
require('dotenv').config();

const express = require('express');
const path    = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// ── Connect to MongoDB ─────────────────────────────────
connectDB();

const app = express();

// ─────────────────────────────────────────────────────
// SECURITY HEADERS (no extra library needed)
// ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

// ─────────────────────────────────────────────────────
// RATE LIMITING (simple in-memory, no library)
// Protects /admin/login from brute-force attacks
// ─────────────────────────────────────────────────────
const loginAttempts = new Map();

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;

  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    // Window expired — reset
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  loginAttempts.set(ip, record);

  if (record.count > maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000 / 60);
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${retryAfter} minute(s).`
    });
  }

  next();
};

// ─────────────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));               // cap JSON body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────────────
// STATIC FILES
// ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────────────────
// VIEW ENGINE
// ─────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Admin API — /admin/login (rate limited), /admin/clients, etc.
app.use('/admin/login', loginRateLimiter);
app.use('/admin', require('./routes/admin'));

// Public client pages — /:username (must be last — catches everything else)
app.use('/', require('./routes/client'));

// ─────────────────────────────────────────────────────
// 404 FALLBACK (only reached if no route matched)
// ─────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).render('404', { message: 'Page not found.' });
  }
  res.status(404).json({ error: 'Not found' });
});

// ─────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER (must be last)
// ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  Server running → http://localhost:${PORT}`);
  console.log(`🔐  Admin API    → http://localhost:${PORT}/admin`);
  console.log(`🌐  Client pages → http://localhost:${PORT}/:username`);
  console.log(`🩺  Health check → http://localhost:${PORT}/health\n`);
});