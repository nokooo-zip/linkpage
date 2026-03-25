const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const Client = require('../models/Client');
const { adminOnly } = require('../middleware/auth');
const { validateClient, validateObjectId } = require('../middleware/validate');
const { createError } = require('../middleware/errorHandler');
const upload = require('../config/multer');

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

// POST /admin/login
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) throw createError(400, 'Username and password are required');
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      throw createError(401, 'Invalid credentials');
    }
    const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Login successful' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// CLIENT CRUD
// ─────────────────────────────────────────────

// GET /admin/clients — list all (supports ?active= and ?search=)
router.get('/clients', adminOnly, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== undefined) filter.active = req.query.active === 'true';
    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [{ name: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }];
    }
    const clients = await Client.find(filter).select('-__v').sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) { next(err); }
});

// POST /admin/clients — create
router.post('/clients', adminOnly, validateClient, async (req, res, next) => {
  try {
    const { username, name, bio, theme, social } = req.body;
    const client = new Client({ username, name, bio, theme, social });
    await client.save();
    res.status(201).json(client);
  } catch (err) { next(err); }
});

// GET /admin/clients/:id — get one
router.get('/clients/:id', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).select('-__v');
    if (!client) throw createError(404, 'Client not found');
    res.json(client);
  } catch (err) { next(err); }
});

// PUT /admin/clients/:id — update (safe fields only)
router.put('/clients/:id', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const allowed = ['name', 'bio', 'theme', 'active', 'social'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const client = await Client.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-__v');
    if (!client) throw createError(404, 'Client not found');
    res.json(client);
  } catch (err) { next(err); }
});

// DELETE /admin/clients/:id — delete + remove image from disk
router.delete('/clients/:id', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) throw createError(404, 'Client not found');
    if (client.profileImage) {
      const imgPath = path.join(__dirname, '..', 'uploads', client.profileImage);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: `Client "@${client.username}" deleted successfully` });
  } catch (err) { next(err); }
});

// PATCH /admin/clients/:id/toggle — flip active/inactive
router.patch('/clients/:id/toggle', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');
    client.active = !client.active;
    await client.save();
    res.json({ active: client.active, message: `Page is now ${client.active ? 'live' : 'hidden'}` });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// PROFILE IMAGE
// ─────────────────────────────────────────────

// POST /admin/clients/:id/image
router.post('/clients/:id/image', adminOnly, validateObjectId, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) throw createError(400, 'No file uploaded');
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');
    if (client.profileImage) {
      const oldPath = path.join(__dirname, '..', 'uploads', client.profileImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    client.profileImage = req.file.filename;
    await client.save();
    res.json({ profileImage: req.file.filename, profileImageUrl: `/uploads/${req.file.filename}` });
  } catch (err) { next(err); }
});

// DELETE /admin/clients/:id/image
router.delete('/clients/:id/image', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');
    if (client.profileImage) {
      const imgPath = path.join(__dirname, '..', 'uploads', client.profileImage);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      client.profileImage = null;
      await client.save();
    }
    res.json({ message: 'Profile image removed' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// QR CODE — supports ?format=png|svg|dataurl
// ─────────────────────────────────────────────

router.get('/clients/:id/qr', adminOnly, validateObjectId, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');
    const pageUrl = `${process.env.BASE_URL}/${client.username}`;
    const format  = req.query.format || 'png';

    if (format === 'svg') {
      const svg = await QRCode.toString(pageUrl, { type: 'svg', margin: 2 });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${client.username}-qr.svg"`);
      return res.send(svg);
    }
    if (format === 'dataurl') {
      const dataUrl = await QRCode.toDataURL(pageUrl, { width: 400, margin: 2 });
      return res.json({ dataUrl, url: pageUrl });
    }
    // Default PNG
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${client.username}-qr.png"`);
    QRCode.toFileStream(res, pageUrl, { width: 400, margin: 2 });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// NESTED LINK ROUTES
// /admin/clients/:id/links → routes/links.js
// ─────────────────────────────────────────────
router.use('/clients/:id/links', adminOnly, require('./links'));

module.exports = router;