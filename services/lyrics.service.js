const axios = require('axios');

/**
 * Service pour récupérer les paroles via LRCLIB
 */
async function getLyrics(artist, title, album = '', duration = 0) {
    try {
        // Nettoyage du titre pour éviter les problèmes de recherche
        const cleanTitle = title.split('(')[0].split('-')[0].trim();
        console.log(`[Lyrics] Recherche pour : ${artist} - ${cleanTitle}`);
        
        const params = {
            artist_name: artist,
            track_name: cleanTitle,
        };
        
        if (album) params.album_name = album;
        if (duration) params.duration = Math.round(duration);

        // LRCLIB a un endpoint /get qui cherche le meilleur match
        const response = await axios.get('https://lrclib.net/api/get', { 
            params,
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
            }
        });

        return {
            plain: response.data.plainLyrics,
            synced: response.data.syncedLyrics,
            instrumental: response.data.instrumental,
            source: 'LRCLIB'
        };
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
