const express = require('express');
const router = express.Router();
const chosicService = require('../services/chosic.service');

/**
 * Route pour obtenir des recommandations via Chosic
 * GET /api/chosic/recommend?artist=...&track=...
 */
router.get('/recommend', async (req, res, next) => {
    try {
        const { artist, track } = req.query;
        
        if (!artist || !track) {
            return res.status(400).json({ error: 'Missing artist or track parameter' });
        }

        console.log(`[Chosic Route] Recommandations pour : ${artist} - ${track}`);

        // 1. Chercher le morceau pour obtenir l'ID Spotify
        const searchQuery = `${artist} ${track}`;
        const searchResult = await chosicService.search(searchQuery, 1);
        const sourceTrack = searchResult.tracks?.items?.[0];

        if (!sourceTrack) {
            console.log('[Chosic Route] Morceau source non trouvé sur Chosic.');
            return res.json({ track: [] });
        }

        // 2. Obtenir les recommandations
        const recommendations = await chosicService.getRecommendations(sourceTrack.id, 15);
        const tracks = recommendations.tracks || [];

        // 3. Formater pour l'application mobile
        const formattedTracks = tracks.map(t => {
            const artistName = t.artists?.[0]?.name || 'Unknown Artist';
            const imageUrl = t.album?.image_default || '';
            
            return {
                // On utilise un préfixe 'cho-' pour signaler qu'il faut chercher le lien de stream
                id: `cho-${t.id}`, 
                title: t.name,
                artist: {
                    name: artistName,
                },
                album: {
                    title: t.album?.name || '',
                    cover_medium: imageUrl,
                    cover_small: imageUrl,
                },
                duration: Math.floor(t.duration_ms / 1000) || 0,
                isSuggestion: true,
                source: 'chosic'
            };
        });

        res.json({ track: formattedTracks });

    } catch (err) {
        console.error('[Chosic Route Error]', err.message);
        // On renvoie une liste vide au lieu d'une erreur 500 pour ne pas bloquer l'UI mobile
        res.json({ track: [], error: 'Chosic service unavailable' });
    }
});

module.exports = router;
