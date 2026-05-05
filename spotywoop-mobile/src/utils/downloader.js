import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = '@spotywoop_downloads_metadata';
const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

// S'assurer que le dossier existe
const ensureDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
};

export const getDownloadMetadata = async () => {
  const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveDownloadMetadata = async (metadata) => {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(metadata));
};

const sanitize = (name) => name ? name.replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, '_') : 'Unknown_Album';

export const startDownload = async (track, downloadUrl, onProgress) => {
  await ensureDir();
  
  const albumFolder = track.album?.title ? `${sanitize(track.album.title)}/` : '';
  const finalDir = `${DOWNLOAD_DIR}${albumFolder}`;
  
  // S'assurer que le sous-dossier existe
  const dirInfo = await FileSystem.getInfoAsync(finalDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(finalDir, { intermediates: true });
  }

  const fileName = `${track.id}.mp3`;
  const fileUri = `${finalDir}${fileName}`;
  
  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    fileUri,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      if (onProgress) onProgress(progress);
    }
  );

  try {
    const { uri } = await downloadResumable.downloadAsync();
    
    // Télécharger aussi l'artwork pour le mode hors-ligne
    let localArtwork = null;
    const artworkUrl = track.album?.cover_big || track.album?.cover_medium || track.thumbnail || track.artwork;
    if (artworkUrl && artworkUrl.startsWith('http')) {
      try {
        const artworkName = `thumb_${track.id}.jpg`;
        const artworkUri = `${DOWNLOAD_DIR}${artworkName}`;
        const artDownloader = FileSystem.createDownloadResumable(artworkUrl, artworkUri);
        const artRes = await artDownloader.downloadAsync();
        localArtwork = artRes.uri;
      } catch (err) {
        console.warn('Artwork download failed:', err);
      }
    }

    // Sauvegarder les métadonnées complètes
    const downloads = await getDownloadMetadata();
    const newDownload = {
      ...track,
      localUri: uri,
      artwork: localArtwork || artworkUrl, // On remplace par le lien local si dispo
      downloadedAt: new Date().toISOString()
    };
    
    await saveDownloadMetadata([newDownload, ...downloads]);
    return newDownload;
  } catch (e) {
    console.error('Download error:', e);
    throw e;
  }
};

const getTrackPath = (track) => {
  const albumFolder = track.album?.title ? `${sanitize(track.album.title)}/` : '';
  return `${DOWNLOAD_DIR}${albumFolder}${track.id}.mp3`;
};

export const isTrackDownloaded = async (track) => {
  if (!track) return false;
  const fileUri = getTrackPath(track);
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists;
  } catch (e) {
    return false;
  }
};

export const deleteDownload = async (track) => {
  if (!track) return;
  const trackId = track.id || track;
  const fileUri = getTrackPath(track);
  const albumFolder = track.album?.title ? `${sanitize(track.album.title)}/` : '';
  const artworkUri = `${DOWNLOAD_DIR}${albumFolder}thumb_${trackId}.jpg`;
  
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    // Note: on ne supprime l'artwork que si c'est le dernier morceau de l'album ? 
    // Pour l'instant on reste simple.
    
    const downloads = await getDownloadMetadata();
    const filtered = downloads.filter(d => String(d.id) !== String(trackId));
    await saveDownloadMetadata(filtered);
  } catch (e) {
    console.error('Delete error:', e);
  }
};
