const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams gives us :id from parent

const Client = require('../models/Client');
const { adminOnly } = require('../middleware/auth');
const { validateLink, validateObjectId } = require('../middleware/validate');
const { createError } = require('../middleware/errorHandler');

// All link routes are nested under /admin/clients/:id/links
// and are protected by adminOnly (applied in admin.js when this router is mounted)

// ─────────────────────────────────────────────
// GET /admin/clients/:id/links
// List all links for a client
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');

    const sorted = [...client.links].sort((a, b) => a.order - b.order);
    res.json(sorted);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// POST /admin/clients/:id/links
// Add a new link to a client
// ─────────────────────────────────────────────
router.post('/', validateLink, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');

    const { label, url, icon } = req.body;

    // New link goes to the end
    const newLink = {
      label,
      url,
      icon: icon || 'link',
      order: client.links.length,
      active: true
    };

    client.links.push(newLink);
    await client.save();

    // Return just the newly added link
    const added = client.links[client.links.length - 1];
    res.status(201).json(added);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// PUT /admin/clients/:id/links/:linkId
// Update a specific link
// ─────────────────────────────────────────────
router.put('/:linkId', validateLink, async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');

    const link = client.links.id(req.params.linkId);
    if (!link) throw createError(404, 'Link not found');

    const { label, url, icon, active } = req.body;
    if (label  !== undefined) link.label  = label;
    if (url    !== undefined) link.url    = url;
    if (icon   !== undefined) link.icon   = icon;
    if (active !== undefined) link.active = active;

    await client.save();
    res.json(link);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// DELETE /admin/clients/:id/links/:linkId
// Remove a specific link
// ─────────────────────────────────────────────
router.delete('/:linkId', async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');

    const link = client.links.id(req.params.linkId);
    if (!link) throw createError(404, 'Link not found');

    link.deleteOne();
    await client.save();

    res.json({ message: 'Link deleted successfully' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// PUT /admin/clients/:id/links/reorder
// Reorder all links in one shot
// Body: { order: ["linkId1", "linkId2", "linkId3"] }
// ─────────────────────────────────────────────
router.put('/reorder/apply', async (req, res, next) => {
  try {
    const { order } = req.body; // array of link IDs in new order

    if (!Array.isArray(order)) {
      throw createError(400, 'order must be an array of link IDs');
    }

    const client = await Client.findById(req.params.id);
    if (!client) throw createError(404, 'Client not found');

    // Assign new order values based on position in the array
    order.forEach((linkId, index) => {
      const link = client.links.id(linkId);
      if (link) link.order = index;
    });

    await client.save();
    const sorted = [...client.links].sort((a, b) => a.order - b.order);
    res.json(sorted);
  } catch (err) { next(err); }
});

module.exports = router;