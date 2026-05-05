import axios from "axios";

// export const BASE_URL = 'http://10.29.82.54:3000/api';
export const BASE_URL = "https://spotywoop-srv.onrender.com/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s pour les cold starts Render
});

export const checkHealth = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
};

export const searchMusic = async (query, config = {}) => {
  try {
    const response = await api.get("/deezer/search", {
      params: { q: query },
      ...config,
    });
    return response.data;
  } catch (error) {
    console.error("Search API error:", error);
    throw error;
  }
};

export const getTrack = async (id) => {
  try {
    const response = await api.get(`/deezer/track/${id}`);
    return response.data;
  } catch (error) {
    console.error("Get Track API error:", error);
    throw error;
  }
};

export const getTrackDownload = async (trackId) => {
  try {
    const response = await api.get(`/deezer/track/${trackId}/download`);
    return response.data;
  } catch (error) {
    console.error("Download API error:", error);
    throw error;
  }
};

export const getArtist = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}`);
    return response.data;
  } catch (error) {
    console.error("Get Artist error:", error);
    throw error;
  }
};

export const getArtistTopTracks = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/top`);
    return response.data;
  } catch (error) {
    console.error("Get Artist Top Tracks error:", error);
    throw error;
  }
};

export const getArtistAlbums = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/albums`);
    return response.data;
  } catch (error) {
    console.error("Get Artist Albums error:", error);
    throw error;
  }
};

export const getAlbum = async (id) => {
  try {
    const response = await api.get(`/deezer/album/${id}`);
    return response.data;
  } catch (error) {
    console.error("Get Album error:", error);
    throw error;
  }
};

export const getRelatedArtists = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/related`);
    return response.data;
  } catch (error) {
    console.error("Get Related Artists error:", error);
    throw error;
  }
};

export const getTrackRadio = async (id) => {
  try {
    const response = await api.get(`/deezer/track/${id}/radio`);
    return response.data;
  } catch (error) {
    console.error("Get Track Radio error:", error);
    throw error;
  }
};

export const getRecommendations = async (artist, track) => {
  try {
    const response = await api.get("/recommend", {
      params: { artist, track },
    });
    return response.data;
  } catch (error) {
    console.error("Get Recommendations error:", error);
    return { track: [] };
  }
};

export const getChosicRecommendations = async (params = {}) => {
  try {
    const response = await api.get("/chosic/recommend", {
      params: {
        artist: params.artist,
        track: params.track,
        genre: params.genre,
        limit: params.limit || 15,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Get Chosic Recommendations error:", error);
    return { track: [] };
  }
};

export const getSearchSuggestions = async (query) => {
  if (!query.trim()) return [];
  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
        },
      },
    );
    const data = await response.json();
    return data[1] || []; // Format: [query, [suggestions]]
  } catch (error) {
    console.error("Suggestions API error:", error);
    return [];
  }
};

export default api;
