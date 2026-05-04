const express = require('express');
const router = express.Router();
const chosicService = require('../services/chosic.service');

/**
 * Route pour obtenir des recommandations via Chosic
 * GET /api/chosic/recommend?artist=...&track=...
 */
router.get('/recommend', async (req, res, next) => {
    try {
        const { artist, track, genre, limit = 15 } = req.query;
        
        let recommendations;

        // MODE 1 : Basé uniquement sur le genre
        if (!track && genre) {
            recommendations = await chosicService.getGenreRecommendations(genre, limit);
        } 
        // MODE 2 : Basé sur morceau(x) + optionnellement genre
        else if (track) {
            // Si c'est une liste d'IDs (multi-seed)
            if (track.includes(',')) {
                recommendations = await chosicService.getRecommendations({
                    seedTracks: track,
                    seedGenres: genre,
                    limit
                });
            } 
            // Si c'est un seul morceau (on cherche l'ID d'abord)
            else {
                const searchQuery = artist ? `${artist} ${track}` : track;
                const searchResult = await chosicService.search(searchQuery, 1);
                const sourceTrack = searchResult.tracks?.items?.[0];

                if (!sourceTrack) {
                    return res.json({ track: [] });
                }

                recommendations = await chosicService.getRecommendations({
                    seedTracks: sourceTrack.id,
                    seedGenres: genre,
                    limit
                });
            }
        } else {
            return res.status(400).json({ error: 'Missing track or genre parameter' });
        }

        const tracks = recommendations.tracks || [];

        // 3. Formater pour l'application mobile
        const formattedTracks = tracks.map(t => {
            const artistName = t.artists?.[0]?.name || 'Unknown Artist';
            const imageUrl = t.album?.image_large || t.album?.image_default || '';
            
            return {
                id: `cho-${t.id}`, 
                title: t.name,
                artist: {
                    name: artistName,
                },
                album: {
                    title: t.album?.name || '',
                    cover_medium: imageUrl, 
                    cover_big: imageUrl,
                },
                duration: Math.floor(t.duration_ms / 1000) || 0,
                isSuggestion: true,
                source: 'chosic'
            };
        });

        res.json({ track: formattedTracks });

    } catch (err) {
        console.error('[Chosic Route Error]', err.message);
        res.json({ track: [], error: 'Chosic service unavailable' });
    }
});

module.exports = router;
