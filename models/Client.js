const mongoose = require('mongoose');

// ─────────────────────────────────────────────
// LINK SUB-SCHEMA
// ─────────────────────────────────────────────
const linkSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Link label is required'],
    trim: true,
    maxlength: [60, 'Label cannot exceed 60 characters']
  },
  url: {
    type: String,
    required: [true, 'Link URL is required'],
    trim: true,
    validate: {
      validator: function (v) {
        // Allow http/https URLs, mailto:, tel:
        return /^(https?:\/\/|mailto:|tel:).+/.test(v);
      },
      message: 'URL must start with http://, https://, mailto:, or tel:'
    }
  },
  icon:    { type: String, default: 'link', trim: true },
  order:   { type: Number, default: 0 },
  active:  { type: Boolean, default: true }
}, { _id: true }); // keep _id so we can target individual links by ID

// ─────────────────────────────────────────────
// CLIENT SCHEMA
// ─────────────────────────────────────────────
const clientSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [2,  'Username must be at least 2 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [
      /^[a-z0-9_-]+$/,
      'Username can only contain lowercase letters, numbers, hyphens, and underscores'
    ]
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [80, 'Name cannot exceed 80 characters']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: ''
  },
  profileImage: {
    type: String,
    default: null   // stores filename from /uploads
  },
  theme: {
    type: String,
    enum: {
      values: ['minimal', 'modern', 'business'],
      message: 'Theme must be one of: minimal, modern, business'
    },
    default: 'minimal'
  },
  // Social handles (optional — used by themes to display icons)
  social: {
    facebook:  { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    twitter:   { type: String, trim: true, default: '' },
    linkedin:  { type: String, trim: true, default: '' },
    youtube:   { type: String, trim: true, default: '' },
    tiktok:    { type: String, trim: true, default: '' },
    whatsapp:  { type: String, trim: true, default: '' },
  },
  links:  { type: [linkSchema], default: [] },
  active: { type: Boolean, default: true },

  // Analytics — simple counters, no personal data stored
  stats: {
    views: { type: Number, default: 0 }
  }
}, {
  timestamps: true  // auto-adds createdAt + updatedAt
});

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────
//clientSchema.index({ username: 1 });   // fast public page lookups
clientSchema.index({ active: 1 });     // filter active clients quickly
clientSchema.index({ createdAt: -1 }); // default sort in admin

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────

// profileImageUrl — full URL for use in templates
clientSchema.virtual('profileImageUrl').get(function () {
  if (!this.profileImage) return null;
  return `/uploads/${this.profileImage}`;
});

// activeLinks — only links marked active, sorted by order
clientSchema.virtual('activeLinks').get(function () {
  return this.links
    .filter(l => l.active)
    .sort((a, b) => a.order - b.order);
});

// Include virtuals when converting to JSON (for API responses)
clientSchema.set('toJSON',   { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────

// Increment page view counter
clientSchema.methods.incrementViews = function () {
  this.stats.views += 1;
  return this.save();
};

// ─────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────

// Find active client by username (used by public route)
clientSchema.statics.findByUsername = function (username) {
  return this.findOne({ username: username.toLowerCase(), active: true });
};

// ─────────────────────────────────────────────
// PRE-SAVE HOOK — normalize link order before saving
// ─────────────────────────────────────────────
clientSchema.pre('save', function (next) {
  // Re-number link orders sequentially (0, 1, 2 …)
  this.links.forEach((link, i) => { link.order = i; });
  next();
});

module.exports = mongoose.model('Client', clientSchema);