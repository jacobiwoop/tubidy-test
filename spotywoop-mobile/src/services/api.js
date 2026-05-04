import axios from 'axios';

// export const BASE_URL = 'http://10.29.82.54:3000/api';
export const BASE_URL = 'https://spotywoop-srv.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export const searchMusic = async (query) => {
  try {
    const response = await api.get('/deezer/search', {
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
    const response = await api.get(`/deezer/track/${trackId}/download`);
    return response.data;
  } catch (error) {
    console.error('Download API error:', error);
    throw error;
  }
};

export const getArtist = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get Artist error:', error);
    throw error;
  }
};

export const getArtistTopTracks = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/top`);
    return response.data;
  } catch (error) {
    console.error('Get Artist Top Tracks error:', error);
    throw error;
  }
};

export const getArtistAlbums = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/albums`);
    return response.data;
  } catch (error) {
    console.error('Get Artist Albums error:', error);
    throw error;
  }
};

export const getRelatedArtists = async (id) => {
  try {
    const response = await api.get(`/deezer/artist/${id}/related`);
    return response.data;
  } catch (error) {
    console.error('Get Related Artists error:', error);
    throw error;
  }
};

export const getTrackRadio = async (id) => {
  try {
    const response = await api.get(`/deezer/track/${id}/radio`);
    return response.data;
  } catch (error) {
    console.error('Get Track Radio error:', error);
    throw error;
  }
};

export default api;
