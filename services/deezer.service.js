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
    console.error(
      `[deezer] Error in getTrack for ID ${id}:`,
      error.response ? error.response.status : error.message,
    );
    if (error.response)
      console.error("[deezer] Error data:", error.response.data);
    throw error;
  }
}

/**
 * Récupère les détails d'un genre.
 */
async function getGenre(id) {
  try {
    const response = await axios.get(`${BASE_URL}/genre/${id}`);
    return response.data;
  } catch (error) {
    console.error(`[deezer] Error in getGenre for ID ${id}:`, error.message);
    throw error;
  }
}

/**
 * Récupère les artistes d'un genre.
 */
async function getGenreArtists(id) {
  try {
    const response = await axios.get(`${BASE_URL}/genre/${id}/artists`);
    return response.data;
  } catch (error) {
    console.error(
      `[deezer] Error in getGenreArtists for ID ${id}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Récupère les playlists populaires pour un certain genre en utilisant les charts.
 */
async function getGenrePlaylists(id, { limit = 10 } = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/chart/${id}/playlists`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error(
      `[deezer] Error in getGenrePlaylists for ID ${id}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Récupère le "Top" (chart) des titres d'un genre.
 */
async function getGenreTracks(id, { limit = 20 } = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/chart/${id}/tracks`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error(
      `[deezer] Error in getGenreTracks for ID ${id}:`,
      error.message,
    );
    return { data: [] };
  }
}

/**
 * Récupère les nouveautés d'un genre (editorial).
 */
async function getGenreReleases(id, { limit = 10 } = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/editorial/${id}/releases`, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error(
      `[deezer] Error in getGenreReleases for ID ${id}:`,
      error.message,
    );
    return { data: [] };
  }
}

module.exports = {
  search,
  searchArtist,
  searchAlbum,
  getTrack,
  getGenre,
  getGenreArtists,
  getGenrePlaylists,
  getGenreTracks,
  getGenreReleases,
};
