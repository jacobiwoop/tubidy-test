import axios from 'axios';

// Replace with your local machine IP or Cloudflare tunnel URL
export const BASE_URL = 'http://10.45.54.54:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

export const searchMusic = async (query) => {
  try {
    const response = await api.get('/api/deezer/search', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    console.error('Search API error:', error);
    throw error;
  }
};

export const getTrackDownload = async (trackId) => {
  try {
    const response = await api.get(`/api/deezer/track/${trackId}/download`);
    return response.data;
  } catch (error) {
    console.error('Download API error:', error);
    throw error;
  }
};

export const getArtist = async (id) => {
  try {
    const response = await api.get(`/api/deezer/artist/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get Artist error:', error);
    throw error;
  }
};

export const getArtistTopTracks = async (id) => {
  try {
    const response = await api.get(`/api/deezer/artist/${id}/top`);
    return response.data;
  } catch (error) {
    console.error('Get Artist Top Tracks error:', error);
    throw error;
  }
};

export const getArtistAlbums = async (id) => {
  try {
    const response = await api.get(`/api/deezer/artist/${id}/albums`);
    return response.data;
  } catch (error) {
    console.error('Get Artist Albums error:', error);
    throw error;
  }
};

export const getRelatedArtists = async (id) => {
  try {
    const response = await api.get(`/api/deezer/artist/${id}/related`);
    return response.data;
  } catch (error) {
    console.error('Get Related Artists error:', error);
    throw error;
  }
};

export default api;
