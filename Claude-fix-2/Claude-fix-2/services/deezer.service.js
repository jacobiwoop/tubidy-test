const axios = require("axios");
const db = require("../config/database");

const BASE_URL = "https://api.deezer.com";

// Timeout par défaut pour tous les appels Deezer
// FIX : avant, aucun timeout n'était configuré → requête pendante indéfiniment
const DEFAULT_TIMEOUT = 8000;

/**
 * Helper pour retenter une requête en cas d'erreur réseau.
 * Backoff exponentiel : 1s, 2s, 4s, 8s...
 */
async function withRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (axios.isCancel(err)) throw err;

      const isNetworkError =
        err.code === "EAI_AGAIN" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNRESET" ||
        err.code === "ENOTFOUND" ||
        !err.response;

      if (isNetworkError && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(
          `[deezer] Network error (${err.code}). Retry in ${delay}ms... (${i + 1}/${retries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

async function search(query, { index = 0, limit = 25, order = "RANKING" } = {}, signal = null) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: query, index, limit, order },
      timeout: DEFAULT_TIMEOUT, // FIX : timeout ajouté
      signal,
    });
    return response.data;
  });
}

async function searchArtist(query, { index = 0, limit = 25 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search/artist`, {
      params: { q: query, index, limit },
      timeout: DEFAULT_TIMEOUT, // FIX
    });
    return response.data;
  });
}

async function searchAlbum(query, { index = 0, limit = 25 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/search/album`, {
      params: { q: query, index, limit },
      timeout: DEFAULT_TIMEOUT, // FIX
    });
    return response.data;
  });
}

/**
 * Récupère un titre par son ID.
 * Cache SQLite intégré — la 2e requête pour le même ID est instantanée.
 */
async function getTrack(id, signal = null) {
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

  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/track/${id}`, {
      timeout: DEFAULT_TIMEOUT, // FIX
      signal,
    });
    const track = response.data;

    if (track && !track.error) {
      try {
        db.prepare(
          `INSERT OR REPLACE INTO tracks (id, title, artist, album, cover_url, preview_url, duration)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          String(track.id),
          track.title,
          track.artist.name,
          track.album.title,
          track.album.cover_medium,
          track.preview,
          track.duration
        );
      } catch (dbErr) {
        console.error("[deezer-cache] Write error:", dbErr.message);
      }
    }

    return track;
  });
}

async function getGenre(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/genre/${id}`, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  });
}

async function getGenreArtists(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/genre/${id}/artists`, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  });
}

async function getGenrePlaylists(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/chart/${id}/playlists`, {
      params: { limit },
      timeout: DEFAULT_TIMEOUT,
    });
    return response.data;
  });
}

async function getGenreTracks(id, { limit = 20 } = {}) {
  try {
    return await withRetry(async () => {
      const response = await axios.get(`${BASE_URL}/chart/${id}/tracks`, {
        params: { limit },
        timeout: DEFAULT_TIMEOUT,
      });
      return response.data;
    });
  } catch (_) {
    return { data: [] };
  }
}

async function getGenreReleases(id, { limit = 10 } = {}) {
  try {
    return await withRetry(async () => {
      const response = await axios.get(`${BASE_URL}/editorial/${id}/releases`, {
        params: { limit },
        timeout: DEFAULT_TIMEOUT,
      });
      return response.data;
    });
  } catch (_) {
    return { data: [] };
  }
}

async function getArtist(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}`, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  });
}

async function getArtistTopTracks(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/top`, {
      params: { limit },
      timeout: DEFAULT_TIMEOUT,
    });
    return response.data;
  });
}

async function getArtistAlbums(id, { limit = 20 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/albums`, {
      params: { limit },
      timeout: DEFAULT_TIMEOUT,
    });
    return response.data;
  });
}

async function getRelatedArtists(id, { limit = 10 } = {}) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/artist/${id}/related`, {
      params: { limit },
      timeout: DEFAULT_TIMEOUT,
    });
    return response.data;
  });
}

async function getRelatedAlbums(id, { limit = 6 } = {}) {
  return withRetry(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/album/${id}/related`, {
        params: { limit },
        timeout: DEFAULT_TIMEOUT,
      });
      return response.data;
    } catch (_) {
      return { data: [] };
    }
  });
}

async function getTrackRadio(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/track/${id}/radio`, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  });
}

async function getAlbum(id) {
  return withRetry(async () => {
    const response = await axios.get(`${BASE_URL}/album/${id}`, { timeout: DEFAULT_TIMEOUT });
    return response.data;
  });
}

async function getTrackLyrics(trackId) {
  const track = await getTrack(trackId);
  if (!track || track.error) throw new Error("Track not found");

  const { title, artist, duration, album } = track;

  return withRetry(async () => {
    try {
      const response = await axios.get("https://lrclib.net/api/get", {
        params: {
          artist_name: artist.name || artist,
          track_name: title,
          album_name: album?.title || "",
          duration,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (_) {
      const searchRes = await axios.get("https://lrclib.net/api/search", {
        params: { q: `${artist.name || artist} ${title}` },
        timeout: 5000,
      });
      return searchRes.data.find((l) => l.syncedLyrics) || searchRes.data[0] || null;
    }
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
  getRelatedAlbums,
  getTrackRadio,
  getAlbum,
  getTrackLyrics,
};
