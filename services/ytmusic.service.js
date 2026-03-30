const axios = require("axios");

class YTMusicService {
  constructor() {
    this.baseUrl = "http://localhost:3001";
  }

  async callServer(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params,
        timeout: 60000, // Le serveur Python peut être lent à cause du proxy
      });

      if (response.data && response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error) {
      console.error(
        `[ytmusic-service] error calling ${endpoint}:`,
        error.message,
      );
      throw error;
    }
  }

  async search(query, filter = "songs", limit = 20) {
    return await this.callServer("/search", { q: query, filter, limit });
  }

  async getSong(videoId) {
    return await this.callServer("/get_song", { id: videoId });
  }

  async getArtist(channelId) {
    return await this.callServer("/get_artist", { id: channelId });
  }
}

module.exports = new YTMusicService();
