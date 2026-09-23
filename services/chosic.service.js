const axios = require('axios');

/**
 * Service pour interroger l'API de Chosic.com
 * Utilise des headers de navigateur pour contourner les protections Cloudflare.
 */

// NOTE: Le cookie de session est nécessaire pour les recommandations.
// Il peut expirer. Preferer CHOSIC_COOKIE dans .env pour eviter de repatcher le code.
const DEFAULT_CHOSIC_COOKIE =
    process.env.CHOSIC_COOKIE || '';

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
    'app': 'playlist_generator',
};

const CHOSIC_TIMEOUT_MS = 20000;

function requestHeaders() {
    const headers = { ...COMMON_HEADERS };
    if (currentChosicCookie) headers.Cookie = currentChosicCookie;
    return headers;
}

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

async function callBrowserAPI(operation, params) {
    const response = await axios.post(
        `${CLOAK_RUNNER_URL}/chosic/api`,
        { operation, params, timeout: 90 },
        { timeout: 120000 },
    );
    const result = response.data?.result;
    if (!response.data?.ok || !result?.ok) {
        throw new Error(`CloakRunner Chosic ${operation} failed`);
    }
    return result.data;
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
    return callBrowserAPI('search', {
        q: query,
        type: 'track',
        limit,
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
    const tracksParam = Array.isArray(seedTracks) ? seedTracks.join(',') : seedTracks;
    const genresParam = Array.isArray(seedGenres) ? seedGenres.join(',') : seedGenres;
    const params = { limit };
    if (tracksParam) params.seed_tracks = tracksParam;
    if (genresParam) params.seed_genres = genresParam;
    return callBrowserAPI('recommendations', params);
}

/**
 * Recommandations basées uniquement sur un genre
 */
async function getGenreRecommendations(genre, limit = 50) {
    return callBrowserAPI('recommendations', { seed_genres: genre, limit });
}

module.exports = {
    search,
    getRecommendations,
    getGenreRecommendations,
    getStatus,
    refreshChosicCookie
};
