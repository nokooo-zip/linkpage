// ─────────────────────────────────────────────────────
// Input validation helpers — no extra library needed.
// Returns an array of error strings; empty = all valid.
// ─────────────────────────────────────────────────────

// Sanitize a string: trim whitespace, strip dangerous HTML chars
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ── Validate a client body (POST /admin/clients) ──────
const validateClient = (req, res, next) => {
  const errors = [];
  const { username, name, bio, theme } = req.body;

  if (!username || username.trim().length < 2) {
    errors.push('Username must be at least 2 characters');
  } else if (!/^[a-z0-9_-]+$/i.test(username.trim())) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores');
  } else if (username.trim().length > 30) {
    errors.push('Username cannot exceed 30 characters');
  }

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length > 80) {
    errors.push('Name cannot exceed 80 characters');
  }

  if (bio && bio.length > 200) {
    errors.push('Bio cannot exceed 200 characters');
  }

  const validThemes = ['minimal', 'modern', 'business'];
  if (theme && !validThemes.includes(theme)) {
    errors.push(`Theme must be one of: ${validThemes.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('. ') });
  }

  // Sanitize string fields before they hit the DB
  if (req.body.username) req.body.username = req.body.username.trim().toLowerCase();
  if (req.body.name)     req.body.name     = sanitizeString(req.body.name);
  if (req.body.bio)      req.body.bio      = sanitizeString(req.body.bio);

  next();
};

// ── Validate a single link body ───────────────────────
const validateLink = (req, res, next) => {
  const errors = [];
  const { label, url } = req.body;

  if (!label || label.trim().length === 0) {
    errors.push('Link label is required');
  } else if (label.trim().length > 60) {
    errors.push('Label cannot exceed 60 characters');
  }

  if (!url || url.trim().length === 0) {
    errors.push('Link URL is required');
  } else if (!/^(https?:\/\/|mailto:|tel:).+/.test(url.trim())) {
    errors.push('URL must start with http://, https://, mailto:, or tel:');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('. ') });
  }

  if (req.body.label) req.body.label = sanitizeString(req.body.label);

  next();
};

// ── Validate MongoDB ObjectId param ──────────────────
const validateObjectId = (req, res, next) => {
  const { id, linkId } = req.params;
  const idToCheck = id || linkId;
  if (!/^[a-f\d]{24}$/i.test(idToCheck)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
};

module.exports = { validateClient, validateLink, validateObjectId, sanitizeString };