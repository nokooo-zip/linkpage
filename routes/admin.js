const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const Client = require('../models/Client');
const { adminOnly } = require('../middleware/auth');
const upload = require('../config/multer');

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

// Add this to handle the main /admin URL
router.get('/', (req, res) => {
    res.send("Admin API is running. Use /login to authenticate.");
    // Or, if you want to show a login page later:
    // res.render('admin/login'); 
});

// POST /admin/login — returns a JWT token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = password === process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { role: 'admin', username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, message: 'Login successful' });
});

// ─────────────────────────────────────────────
// CLIENT CRUD (all protected by adminOnly)
// ─────────────────────────────────────────────

// GET /admin/clients — list all clients
router.get('/clients', adminOnly, async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/clients — create a new client
router.post('/clients', adminOnly, async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (err) {
    // Handle duplicate username
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(400).json({ error: err.message });
  }
});

// GET /admin/clients/:id — get a single client
router.get('/clients/:id', adminOnly, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/clients/:id — update a client
router.put('/clients/:id', adminOnly, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /admin/clients/:id — delete a client
router.delete('/clients/:id', adminOnly, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: `Client "${client.username}" deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PROFILE IMAGE UPLOAD
// ─────────────────────────────────────────────

// POST /admin/clients/:id/image
router.post('/clients/:id/image', adminOnly, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.filename },
      { new: true }
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json({ profileImage: req.file.filename, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────

// GET /admin/clients/:id/qr — download QR code as PNG
router.get('/clients/:id/qr', adminOnly, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const pageUrl = `${process.env.BASE_URL}/${client.username}`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${client.username}-qr.png"`);

    QRCode.toFileStream(res, pageUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;