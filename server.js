require('dotenv').config();

const cookieParser = require('cookie-parser');

const express  = require('express');
const path     = require('path');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

connectDB();

const app = express();

// ── Security headers ──────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

// ── Rate limiter for /admin/login ─────────────────────
const loginAttempts = new Map();
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + windowMs; }
  record.count++;
  loginAttempts.set(ip, record);
  if (record.count > maxAttempts) {
    const mins = Math.ceil((record.resetAt - now) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute(s).` });
  }
  next();
};

// ── Body parsers ──────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

// ── Static files ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── View engine ───────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Inject BASE_URL into every EJS template automatically
app.use((req, res, next) => {
  res.locals.BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  next();
});

// ── Routes ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Admin dashboard HTML (served before the API router intercepts /admin)
app.get('/dashboard', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'admin', 'index.html'));
});

app.use('/admin/login', loginRateLimiter);
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/client'));

// ── 404 fallback ──────────────────────────────────────
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('404', { message: 'Page not found.' });
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler (must be last) ───────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀  Server        → http://localhost:${PORT}`);
  console.log(`🔐  Admin API     → http://localhost:${PORT}/admin`);
  console.log(`🌐  Client pages  → http://localhost:${PORT}/:username`);
  console.log(`🩺  Health check  → http://localhost:${PORT}/health\n`);
});