const express = require('express');
const router  = express.Router();
const lyricsService = require('../services/lyrics.service');

router.get('/', async (req, res, next) => {
  try {
    const { artist, title, album, duration, id } = req.query;
    
    if (!artist || !title) {
        return res.status(400).json({ error: 'Artist and title are required' });
    }

    const lyrics = await lyricsService.getLyrics(artist, title, album, duration, id);
    
    if (!lyrics) {
        return res.status(404).json({ error: 'Lyrics not found' });
    }
    
    res.json(lyrics);
  } catch (err) { 
    console.error('[Lyrics Route Error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
