import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYLISTS_KEY = '@tubidy_playlists';

// Playlist par défaut (Favoris)
const DEFAULT_PLAYLISTS = [
  { id: 'liked', title: 'Liked Songs', tracks: [] }
];

export const getPlaylists = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(PLAYLISTS_KEY);
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    // Si c'est la première fois, on initialise avec "Liked Songs"
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(DEFAULT_PLAYLISTS));
    return DEFAULT_PLAYLISTS;
  } catch (e) {
    console.error('Error getting playlists', e);
    return DEFAULT_PLAYLISTS;
  }
};

export const createPlaylist = async (title) => {
  try {
    const playlists = await getPlaylists();
    const newPlaylist = {
      id: Date.now().toString(),
      title,
      tracks: []
    };
    const updated = [...playlists, newPlaylist];
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error creating playlist', e);
    return null;
  }
};

export const addTrackToPlaylist = async (playlistId, track) => {
  try {
    const playlists = await getPlaylists();
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        // On évite les doublons
        const exists = pl.tracks.some(t => t.id === track.id);
        if (!exists) {
          return { ...pl, tracks: [...pl.tracks, track] };
        }
      }
      return pl;
    });
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error adding track to playlist', e);
    return null;
  }
};

export const removeTrackFromPlaylist = async (playlistId, trackId) => {
  try {
    const playlists = await getPlaylists();
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    });
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error removing track', e);
    return null;
  }
};
