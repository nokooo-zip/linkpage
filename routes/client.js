const express = require('express');
const router = express.Router();
const Client = require('../models/Client');

// GET /:username — the public page for each client
router.get('/:username', async (req, res) => {
  try {
    const client = await Client.findOne({
      username: req.params.username.toLowerCase(),
      active: true
    });

    if (!client) {
      return res.status(404).render('404', {
        message: `No page found for "@${req.params.username}"`
      });
    }

    // Sort links by their order field
    client.links.sort((a, b) => a.order - b.order);

    // Render the correct theme template
    res.render(`themes/${client.theme}`, { client });

  } catch (err) {
    console.error(err);
    res.status(500).render('404', { message: 'Something went wrong.' });
  }
});

module.exports = router;