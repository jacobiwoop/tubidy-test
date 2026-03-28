const axios = require("axios");

/**
 * Service pour interagir avec l'API Deezer.
 * Se base sur la documentation officielle (documentation/deezer/)
 */

const BASE_URL = "https://api.deezer.com";

/**
 * Recherche globale sur Deezer (titres par défaut).
 * @param {string} query - Terme de recherche
 * @param {object} options - index, limit, order
 */
async function search(
  query,
  { index = 0, limit = 25, order = "RANKING" } = {},
) {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: query, index, limit, order },
    });
    return response.data;
  } catch (error) {
    console.error("[deezer] Error in search:", error.message);
    throw error;
  }
}

/**
 * Recherche spécifique d'artistes.
 */
async function searchArtist(query, { index = 0, limit = 25 } = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/search/artist`, {
      params: { q: query, index, limit },
    });
    return response.data;
  } catch (error) {
    console.error("[deezer] Error in searchArtist:", error.message);
    throw error;
  }
}

/**
 * Recherche spécifique d'albums.
 */
async function searchAlbum(query, { index = 0, limit = 25 } = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/search/album`, {
      params: { q: query, index, limit },
    });
    return response.data;
  } catch (error) {
    console.error("[deezer] Error in searchAlbum:", error.message);
    throw error;
  }
}

/**
 * Récupère les détails d'un titre par son ID.
 */
async function getTrack(id) {
  try {
    const response = await axios.get(`${BASE_URL}/track/${id}`);
    return response.data;
  } catch (error) {
    console.error("[deezer] Error in getTrack:", error.message);
    throw error;
  }
}

module.exports = {
  search,
  searchArtist,
  searchAlbum,
  getTrack,
};
