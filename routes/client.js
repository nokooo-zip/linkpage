const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// GET /:username — public client page
router.get('/:username', async (req, res, next) => {
  try {
    const client = await Client.findByUsername(req.params.username);
    if (!client) return res.status(404).render('404', { message: 'Page not found.' });

    client.incrementViews().catch(() => {});

    res.render(`themes/${client.theme}`, {
      user: {
        name:         client.name,
        bio:          client.bio,
        profileImage: client.profileImageUrl,
        links:        client.activeLinks.map(l => ({ title: l.label, url: l.url, icon: l.icon })),
        social:       client.social
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;