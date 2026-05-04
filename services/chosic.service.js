const axios = require('axios');

/**
 * Service pour interroger l'API de Chosic.com
 * Utilise des headers de navigateur pour contourner les protections Cloudflare.
 */

// NOTE: Le cookie de session est nécessaire pour les recommandations.
// Il peut expirer. Idéalement, il devrait être dans ton fichier .env
const CHOSIC_COOKIE = process.env.CHOSIC_COOKIE || "pll_language=en; r_34874064=1777902685%7C4e2bfcf40f4bef5f%7Ce8254c82a5bc41c9b68926907b183abe92ea0912ed7b419b5c92c95a94744a7a";

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.chosic.com/playlist-generator/',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Sec-Ch-Ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Linux"',
};

/**
 * Recherche des morceaux sur Chosic (Source Spotify)
 */
async function search(query, limit = 10) {
    try {
        console.log(`[Chosic] Recherche : ${query}`);
        const response = await axios.get('https://www.chosic.com/api/tools/search', {
            params: { q: query, type: 'track', limit },
            headers: {
                ...COMMON_HEADERS,
                'Cookie': CHOSIC_COOKIE
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Chosic Search Error]', error.response?.status, error.response?.data);
        throw error;
    }
}

/**
 * Récupère des recommandations basées sur des IDs Spotify, des genres ou les deux.
 * @param {Object} options 
 * @param {string|string[]} options.seedTracks - ID ou tableau d'IDs Spotify
 * @param {string|string[]} options.seedGenres - Genre ou tableau de genres
 * @param {number} options.limit - Nombre de résultats (max 100)
 */
async function getRecommendations({ seedTracks = [], seedGenres = [], limit = 20 }) {
    try {
        const tracksParam = Array.isArray(seedTracks) ? seedTracks.join(',') : seedTracks;
        const genresParam = Array.isArray(seedGenres) ? seedGenres.join(',') : seedGenres;

        console.log(`[Chosic] Récupération des recommandations. Tracks: ${tracksParam} | Genres: ${genresParam}`);
        
        const params = { limit };
        if (tracksParam) params.seed_tracks = tracksParam;
        if (genresParam) params.seed_genres = genresParam;

        const response = await axios.get('https://www.chosic.com/api/tools/recommendations', {
            params,
            headers: {
                ...COMMON_HEADERS,
                'Cookie': CHOSIC_COOKIE
            }
        });
        
        return response.data;
    } catch (error) {
        if (error.response?.data === 'Missing token') {
            console.error('[Chosic Recommend Error] Le cookie est expiré ou invalide.');
        } else {
            console.error('[Chosic Recommend Error]', error.message);
        }
        throw error;
    }
}

/**
 * Recommandations basées uniquement sur un genre
 */
async function getGenreRecommendations(genre, limit = 50) {
    try {
        console.log(`[Chosic] Découvertes pour le genre : ${genre}`);
        const response = await axios.get('https://www.chosic.com/api/tools/recommendations', {
            params: { 
                seed_genres: genre,
                limit 
            },
            headers: {
                ...COMMON_HEADERS,
                'Cookie': CHOSIC_COOKIE
            }
        });
        return response.data;
    } catch (error) {
        console.error('[Chosic Genre Error]', error.message);
        throw error;
    }
}

module.exports = {
    search,
    getRecommendations,
    getGenreRecommendations
};
