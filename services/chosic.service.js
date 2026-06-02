const axios = require('axios');

/**
 * Service pour interroger l'API de Chosic.com
 * Utilise des headers de navigateur pour contourner les protections Cloudflare.
 */

// NOTE: Le cookie de session est nécessaire pour les recommandations.
// Il peut expirer. Preferer CHOSIC_COOKIE dans .env pour eviter de repatcher le code.
const DEFAULT_CHOSIC_COOKIE =
    process.env.CHOSIC_COOKIE ||
    "pll_language=en; r_34874064=1780348856%7C5afe2943a0b56d94%7Ce09188070a6ba8ed952b221bb837981c47308bb9963294b720730271b9387c65";

const CLOAK_RUNNER_URL =
    (process.env.CLOAK_RUNNER_URL || "http://cloak.204.236.198.29.traefik.me").replace(/\/+$/, "");

let currentChosicCookie = DEFAULT_CHOSIC_COOKIE;
let refreshPromise = null;
let lastRefresh = null;

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.chosic.com/playlist-generator/',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Sec-Ch-Ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Linux"',
};

function getStatus() {
    return {
        refreshingCookie: Boolean(refreshPromise),
        lastRefresh
    };
}

function isCookieError(error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = typeof data === 'string' ? data : JSON.stringify(data || '');
    return status === 401 ||
        /missing token/i.test(message) ||
        /token expired/i.test(message) ||
        /cookie/i.test(message);
}

async function refreshChosicCookie() {
    if (refreshPromise) {
        console.log('[Chosic] Cookie refresh already running, waiting...');
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const started = Date.now();
        console.log('[Chosic] Refreshing cookie via CloakRunner...');

        const response = await axios.post(
            `${CLOAK_RUNNER_URL}/chosic/focus-cookie`,
            { timeout: 180 },
            { timeout: 240000 }
        );

        const cookieHeader = response.data?.result?.cookie_header;
        if (!cookieHeader) {
            throw new Error('CloakRunner did not return cookie_header');
        }

        currentChosicCookie = cookieHeader;
        lastRefresh = {
            ok: true,
            at: new Date().toISOString(),
            duration_ms: Date.now() - started,
            cookie_header_length: cookieHeader.length
        };
        console.log(`[Chosic] Cookie refreshed in ${lastRefresh.duration_ms}ms`);
        return currentChosicCookie;
    })();

    try {
        return await refreshPromise;
    } catch (error) {
        lastRefresh = {
            ok: false,
            at: new Date().toISOString(),
            error: error.message
        };
        throw error;
    } finally {
        refreshPromise = null;
    }
}

async function withCookieRefresh(operationName, requestFn) {
    try {
        return await requestFn();
    } catch (error) {
        if (!isCookieError(error)) {
            throw error;
        }

        console.warn(`[Chosic] ${operationName} failed because cookie is invalid. Refreshing...`);
        await refreshChosicCookie();
        console.log(`[Chosic] Retrying ${operationName} after cookie refresh...`);
        return requestFn();
    }
}

/**
 * Recherche des morceaux sur Chosic (Source Spotify)
 */
async function search(query, limit = 10) {
    return withCookieRefresh('search', async () => {
        console.log(`[Chosic] Recherche : ${query}`);
        const response = await axios.get('https://www.chosic.com/api/tools/search', {
            params: { q: query, type: 'track', limit },
            headers: {
                ...COMMON_HEADERS,
                'Cookie': currentChosicCookie
            }
        });
        return response.data;
    });
}

/**
 * Récupère des recommandations basées sur des IDs Spotify, des genres ou les deux.
 * @param {Object} options 
 * @param {string|string[]} options.seedTracks - ID ou tableau d'IDs Spotify
 * @param {string|string[]} options.seedGenres - Genre ou tableau de genres
 * @param {number} options.limit - Nombre de résultats (max 100)
 */
async function getRecommendations({ seedTracks = [], seedGenres = [], limit = 20 }) {
    return withCookieRefresh('recommendations', async () => {
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
                'Cookie': currentChosicCookie
            }
        });
        
        return response.data;
    });
}

/**
 * Recommandations basées uniquement sur un genre
 */
async function getGenreRecommendations(genre, limit = 50) {
    return withCookieRefresh('genre recommendations', async () => {
        console.log(`[Chosic] Découvertes pour le genre : ${genre}`);
        const response = await axios.get('https://www.chosic.com/api/tools/recommendations', {
            params: { 
                seed_genres: genre,
                limit 
            },
            headers: {
                ...COMMON_HEADERS,
                'Cookie': currentChosicCookie
            }
        });
        return response.data;
    });
}

module.exports = {
    search,
    getRecommendations,
    getGenreRecommendations,
    getStatus,
    refreshChosicCookie
};
