const express = require('express');
const router  = express.Router();
const LastFM = require('last-fm');

// Initialisation du client avec la clé API du .env
const lastfm = new LastFM(process.env.LASTFM_API_KEY);

router.get('/', async (req, res, next) => {
  try {
    const { artist, track } = req.query;
    
    if (!artist || !track) {
      return res.status(400).json({ error: 'Missing artist or track parameter' });
    }

    if (!process.env.LASTFM_API_KEY) {
      console.warn('[Recommend] LASTFM_API_KEY is not set. Returning empty suggestions.');
      return res.json({ track: [] });
    }

    console.log(`[Recommend] Searching similar tracks for: ${artist} - ${track}`);

    lastfm.trackSimilar({ name: track, artistName: artist, limit: 10 }, (err, data) => {
      if (err) {
        console.error('[LastFM Error Detail]', err);
        // On ne renvoie pas une 500 pour ne pas planter l'app, juste une liste vide
        return res.json({ track: [], error: 'LastFM request failed' });
      }
      
      if (!data || !data.track) {
        return res.json({ track: [] });
      }
      
      const tracks = data.track || [];
      const formattedTracks = tracks.map(t => {
        // Extraction de l'image
        const images = t.image || [];
        const bestImage = images.find(img => img.size === 'mega') || 
                          images.find(img => img.size === 'extralarge') || 
                          images[images.length - 1];
        const imageUrl = bestImage ? (bestImage['#text'] || '') : '';

        return {
          id: `lfm-${encodeURIComponent(t.name)}-${encodeURIComponent(t.artist.name)}`, // ID temporaire safe
          title: t.name,
          artist: {
            name: t.artist.name,
          },
          album: {
            cover_medium: imageUrl,
            cover_small: imageUrl,
          },
          duration: 0,
          isSuggestion: true
        };
      });

      res.json({ track: formattedTracks });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
