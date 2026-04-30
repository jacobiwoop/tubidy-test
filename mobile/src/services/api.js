import axios from 'axios';

// Replace with your local machine IP or Cloudflare tunnel URL
const BASE_URL = 'http://10.45.54.54:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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

export default api;
