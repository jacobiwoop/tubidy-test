import { getPlaylists, addTrackToPlaylist, removeTrackFromPlaylist } from './playlists';

export const isTrackFavorite = async (trackId) => {
  const playlists = await getPlaylists();
  const likedPlaylist = playlists.find(p => p.id === 'liked');
  return likedPlaylist ? likedPlaylist.tracks.some(t => t.id === trackId) : false;
};

export const saveFavorite = async (track) => {
  const isFav = await isTrackFavorite(track.id);
  if (isFav) {
    await removeTrackFromPlaylist('liked', track.id);
    return false;
  } else {
    await addTrackToPlaylist('liked', track);
    return true;
  }
};

export const getFavorites = async () => {
  const playlists = await getPlaylists();
  const likedPlaylist = playlists.find(p => p.id === 'liked');
  return likedPlaylist ? likedPlaylist.tracks : [];
};
