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

    console.log(`[Recommend] Searching similar tracks for: ${artist} - ${track}`);

    lastfm.trackSimilar({ name: track, artistName: artist, limit: 10 }, (err, data) => {
      if (err) {
        console.error('[LastFM Error Detail]', err);
        return res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message || err });
      }
      
      // On formate les résultats de Last.fm pour qu'ils ressemblent à ce que l'App attend (format Deezer)
      const tracks = data.track || [];
      const formattedTracks = tracks.map(t => {
        // Extraction de l'image (on cherche 'mega', puis 'extralarge')
        const images = t.image || [];
        const bestImage = images.find(img => img.size === 'mega') || 
                          images.find(img => img.size === 'extralarge') || 
                          images[images.length - 1];
        const imageUrl = bestImage ? bestImage['#text'] : '';

        return {
          id: `lfm-${t.name}-${t.artist.name}`, // ID temporaire
          title: t.name,
          artist: {
            name: t.artist.name,
          },
          album: {
            cover_medium: imageUrl,
            cover_small: imageUrl,
          },
          duration: 0, // Last.fm ne donne pas toujours la durée ici
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
