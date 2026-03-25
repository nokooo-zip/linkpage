// ─────────────────────────────────────────────────────
// Centralized error handler — plug in at the end of server.js
// Usage: app.use(errorHandler)
// ─────────────────────────────────────────────────────

const errorHandler = (err, req, res, next) => {
  // Log full error in development, short message in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.stack || err.message}`);
  } else {
    console.error(`[ERROR] ${err.message}`);
  }

  // ── Mongoose validation error (bad field values) ──
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join('. ') });
  }

  // ── Mongoose duplicate key (e.g. duplicate username) ──
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `"${err.keyValue[field]}" is already taken. Please choose a different ${field}.`
    });
  }

  // ── Mongoose bad ObjectId (e.g. /clients/not-a-real-id) ──
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  // ── JWT errors ──
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // ── Multer file upload errors ──
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  // ── Custom app errors (thrown with a status property) ──
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // ── Fallback: 500 Internal Server Error ──
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : err.message
  });
};

// Helper to create a custom error with a status code
// Usage: throw createError(404, 'Client not found')
const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = { errorHandler, createError };