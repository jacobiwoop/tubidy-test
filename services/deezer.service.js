const axios = require("axios");
const db = require("../config/database");

/**
 * Service pour interagir avec l'API Deezer.
 */

const BASE_URL = "https://api.deezer.com";

/**
 * Helper pour retenter une requête en cas d'erreur réseau (EAI_AGAIN, ETIMEDOUT).
 * Utilise désormais un backoff exponentiel (1s, 2s, 4s, 8s...).
 */
async function withRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError =
        err.code === "EAI_AGAIN" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNRESET" ||
        err.code === "ENOTFOUND" ||
        !err.response;

      if (isNetworkError && i < retries - 1) {
        // Backoff exponentiel : 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, i) * 1000;
        console.warn(
          `[deezer] Network error (${err.code}). Retrying in ${delay}ms... (${i + 1}/${retries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Recherche globale sur Deezer (titres par défaut).
 */
async function search(
  query,
  { index = 0, limit = 25, order = "RANKING" } = {},
  signal = null,
) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: query, index, limit, order },
      signal,
    });
    return response.data;
  });
}

/**
 * Recherche spécifique d'artistes.
 */
async function searchArtist(query, { index = 0, limit = 25 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search/artist`, {
      params: { q: query, index, limit },
    });
    return response.data;
  });
}

/**
 * Recherche spécifique d'albums.
 */
async function searchAlbum(query, { index = 0, limit = 25 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search/album`, {
      params: { q: query, index, limit },
    });
    return response.data;
  });
}

/**
 * Récupère les détails d'un titre par son ID.
 * Utilise le cache SQLite pour éviter les requêtes inutiles.
 */
async function getTrack(id, signal = null) {
  // 1. Vérifier le cache SQLite
  try {
    const cached = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);
    if (cached) {
      console.log(`[deezer-cache] Hit for ID: ${id}`);
      return {
        id: cached.id,
        title: cached.title,
        artist: { name: cached.artist },
        album: {
          title: cached.album,
          cover_medium: cached.cover_url,
          cover_big: cached.cover_url,
        },
        preview: cached.preview_url,
        duration: cached.duration,
      };
    }
  } catch (dbErr) {
    console.error("[deezer-cache] Read error:", dbErr.message);
  }

  // 2. Si pas en cache, appeler l'API avec retry
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/track/${id}`, { signal });
    const track = response.data;

    if (track && !track.error) {
      // 3. Sauvegarder dans le cache pour la prochaine fois
      try {
        db.prepare(
          `
          INSERT OR REPLACE INTO tracks (id, title, artist, album, cover_url, preview_url, duration)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        ).run(
          String(track.id),
          track.title,
          track.artist.name,
          track.album.title,
          track.album.cover_medium,
          track.preview,
          track.duration,
        );
      } catch (dbErr) {
        console.error("[deezer-cache] Write error:", dbErr.message);
      }
    }

    return track;
  });
}

/**
 * Récupère les détails d'un genre.
 */
async function getGenre(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/genre/${id}`);
    return response.data;
  });
}

/**
 * Récupère les artistes d'un genre.
 */
async function getGenreArtists(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/genre/${id}/artists`);
    return response.data;
  });
}

/**
 * Récupère les playlists populaires pour un certain genre en utilisant les charts.
 */
async function getGenrePlaylists(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/chart/${id}/playlists`, {
      params: { limit },
    });
    return response.data;
  });
}

/**
 * Récupère le "Top" (chart) des titres d'un genre.
 */
async function getGenreTracks(id, { limit = 20 } = {}) {
  try {
    return await withRetry(async () => {
      const response = await axios.get(`${BASE_URL}/chart/${id}/tracks`, {
        params: { limit },
      });
      return response.data;
    });
  } catch (err) {
    return { data: [] };
  }
}

/**
 * Récupère les nouveautés d'un genre (editorial).
 */
async function getGenreReleases(id, { limit = 10 } = {}) {
  try {
    return await withRetry(async () => {
      const response = await axios.get(`${BASE_URL}/editorial/${id}/releases`, {
        params: { limit },
      });
      return response.data;
    });
  } catch (err) {
    return { data: [] };
  }
}

/**
 * Récupère les détails d'un artiste.
 */
async function getArtist(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}`);
    return response.data;
  });
}

/**
 * Récupère les titres les plus populaires d'un artiste.
 */
async function getArtistTopTracks(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/top`, {
      params: { limit },
    });
    return response.data;
  });
}

/**
 * Récupère les albums d'un artiste.
 */
async function getArtistAlbums(id, { limit = 20 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/albums`, {
      params: { limit },
    });
    return response.data;
  });
}

/**
 * Récupère les artistes similaires.
 */
async function getRelatedArtists(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/related`, {
      params: { limit },
    });
    return response.data;
  });
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
  getArtist,
  getArtistTopTracks,
  getArtistAlbums,
  getRelatedArtists,
};
