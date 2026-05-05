const axios = require('axios');
const db = require('../config/database');

/**
 * Service pour récupérer les paroles via LRCLIB avec cache SQLite
 */
async function getLyrics(artist, title, album = '', duration = 0, id = null) {
    try {
        // 1. Vérification du cache (si un ID est fourni)
        if (id) {
            const cached = db.prepare('SELECT * FROM lyrics_cache WHERE track_id = ?').get(id);
            if (cached) {
                console.log(`[Lyrics] Cache HIT pour : ${id} (${artist} - ${title})`);
                return {
                    plain: cached.plain,
                    synced: cached.synced,
                    instrumental: !!cached.instrumental,
                    source: 'Cache'
                };
            }
        }

        // Nettoyage du titre pour éviter les problèmes de recherche
        const cleanTitle = title.split('(')[0].split('-')[0].trim();
        console.log(`[Lyrics] Cache MISS. Recherche LRCLIB pour : ${artist} - ${cleanTitle}`);
        
        const params = {
            artist_name: artist,
            track_name: cleanTitle,
        };
        
        if (album) params.album_name = album;
        if (duration) params.duration = Math.round(duration);

        // LRCLIB a un endpoint /get qui cherche le meilleur match
        let response;
        try {
            response = await axios.get('https://lrclib.net/api/get', { 
                params,
                timeout: 10000,
                headers: { 'User-Agent': 'TubidyPlayer/1.0' }
            });
        } catch (e) {
            if (e.response?.status === 404 && (album || duration)) {
                console.log(`[Lyrics] 404 avec params précis. Tentative simplifiée pour : ${artist} - ${cleanTitle}`);
                response = await axios.get('https://lrclib.net/api/get', { 
                    params: { artist_name: artist, track_name: cleanTitle },
                    timeout: 10000,
                    headers: { 'User-Agent': 'TubidyPlayer/1.0' }
                });
            } else {
                throw e;
            }
        }

        const result = {
            plain: response.data.plainLyrics,
            synced: response.data.syncedLyrics,
            instrumental: response.data.instrumental,
            source: 'LRCLIB'
        };

        // 2. Sauvegarde dans le cache (si un ID est fourni)
        if (id && result) {
            try {
                db.prepare('INSERT OR REPLACE INTO lyrics_cache (track_id, plain, synced, instrumental) VALUES (?, ?, ?, ?)')
                  .run(id, result.plain, result.synced, result.instrumental ? 1 : 0);
                console.log(`[Lyrics] Sauvegardé dans le cache pour : ${id}`);
            } catch (cacheErr) {
                console.error('[Lyrics Cache Error]', cacheErr.message);
            }
        }

        return result;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('[Lyrics] Pas de paroles trouvées sur LRCLIB.');
            return null;
        }
        console.error('[Lyrics Error]', error.message);
        throw error;
    }
}

module.exports = {
    getLyrics
};
