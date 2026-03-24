const mongoose = require('mongoose');

// Each link in the client's link list
const linkSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },  // e.g. "My Instagram"
  url:   { type: String, required: true, trim: true },  // e.g. "https://instagram.com/xyz"
  icon:  { type: String, default: 'link' },             // icon name (for frontend use)
  order: { type: Number, default: 0 }                   // for drag-to-reorder later
});

const clientSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores']
  },
  name:         { type: String, required: true, trim: true },
  bio:          { type: String, trim: true, maxlength: 200 },
  profileImage: { type: String, default: null },   // filename in /uploads
  theme: {
    type: String,
    enum: ['minimal', 'modern', 'business'],
    default: 'minimal'
  },
  links:  [linkSchema],
  active: { type: Boolean, default: true },
}, {
  timestamps: true  // adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Client', clientSchema);