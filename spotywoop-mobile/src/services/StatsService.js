import AsyncStorage from '@react-native-async-storage/async-storage';

const DNA_STORAGE_KEY = '@spotywoop_music_dna';

const INITIAL_DNA = {
  topArtists: {}, // { "Damso": 15, "The Weeknd": 8 }
  topGenres: {},  // { "hip-hop": 25, "synth-pop": 10 }
  history: [],    // [ { id, title, artist, timestamp }, ... ]
  totalPlays: 0,
  totalLikes: 0,
  lastUpdated: null
};

class StatsService {
  /**
   * Récupère l'ADN musical complet depuis le stockage local
   */
  async getDNA() {
    try {
      const data = await AsyncStorage.getItem(DNA_STORAGE_KEY);
      return data ? JSON.parse(data) : { ...INITIAL_DNA };
    } catch (error) {
      console.error('[StatsService] Error getting DNA:', error);
      return { ...INITIAL_DNA };
    }
  }

  /**
   * Enregistre une écoute
   */
  async recordTrackPlay(track) {
    if (!track) return;
    const dna = await this.getDNA();
    
    // 1. Incrémenter le score de l'artiste
    const artistName = track.artist?.name || track.artist;
    if (artistName) {
      dna.topArtists[artistName] = (dna.topArtists[artistName] || 0) + 1;
    }

    // 2. Incrémenter le score du genre (si dispo dans l'objet track)
    const genre = track.genre || track.category;
    if (genre) {
      dna.topGenres[genre] = (dna.topGenres[genre] || 0) + 1;
    }

    // 3. Ajouter à l'historique (max 50)
    const historyEntry = {
      id: track.id,
      title: track.title,
      artist: artistName,
      artwork: track.album?.cover_medium || track.thumbnail || track.artwork,
      timestamp: Date.now()
    };
    dna.history = [historyEntry, ...dna.history.filter(t => t.id !== track.id)].slice(0, 50);

    // 4. Update stats
    dna.totalPlays += 1;
    dna.lastUpdated = Date.now();

    await this.saveDNA(dna);
    return dna;
  }

  /**
   * Enregistre un Like (poids plus fort)
   */
  async recordTrackLike(track, isLiked = true) {
    if (!track) return;
    const dna = await this.getDNA();
    const weight = isLiked ? 5 : -3; // Un like vaut 5 écoutes, un unlike retire des points

    const artistName = track.artist?.name || track.artist;
    if (artistName) {
      dna.topArtists[artistName] = Math.max(0, (dna.topArtists[artistName] || 0) + weight);
    }

    const genre = track.genre || track.category;
    if (genre) {
      dna.topGenres[genre] = Math.max(0, (dna.topGenres[genre] || 0) + weight);
    }

    if (isLiked) dna.totalLikes += 1;
    dna.lastUpdated = Date.now();

    await this.saveDNA(dna);
    return dna;
  }

  /**
   * Retourne les "Seeds" intelligents pour les recommandations
   */
  async getSmartSeeds() {
    const dna = await this.getDNA();
    
    // Trier les artistes par score
    const sortedArtists = Object.entries(dna.topArtists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    // Trier les genres par score
    const sortedGenres = Object.entries(dna.topGenres)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(entry => entry[0]);

    // Dernier morceau écouté
    const lastTrack = dna.history[0];

    return {
      topArtists: sortedArtists,
      topGenres: sortedGenres,
      lastTrack: lastTrack
    };
  }

  async saveDNA(dna) {
    try {
      await AsyncStorage.setItem(DNA_STORAGE_KEY, JSON.stringify(dna));
    } catch (error) {
      console.error('[StatsService] Error saving DNA:', error);
    }
  }

  async resetDNA() {
    await AsyncStorage.removeItem(DNA_STORAGE_KEY);
    return { ...INITIAL_DNA };
  }
}

export default new StatsService();
