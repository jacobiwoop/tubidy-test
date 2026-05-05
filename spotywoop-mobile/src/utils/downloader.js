import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = '@spotywoop_downloads_metadata';
const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

/**
 * Nettoie les noms de fichiers et dossiers pour éviter les erreurs FS
 */
const sanitize = (name) => {
  if (name === undefined || name === null) return 'Unknown';
  // Conversion en string + retrait des caractères spéciaux interdits sur mobile FS
  return String(name).replace(/[#%&{}\\<>*?/$!'":@+`|=]/g, '_').trim() || 'Unknown';
};

/**
 * S'assurer que le dossier racine existe
 */
const ensureDir = async (path = DOWNLOAD_DIR) => {
  const dirInfo = await FileSystem.getInfoAsync(path);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
};

export const getDownloadMetadata = async () => {
  const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveDownloadMetadata = async (metadata) => {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(metadata));
};

export const getTrackPath = (track) => {
  const albumId = track.album?.id || track.albumId;
  const albumFolder = albumId ? `${sanitize(albumId)}/` : '';
  return `${DOWNLOAD_DIR}${albumFolder}${track.id}.mp3`;
};

/**
 * Vérifie si un morceau est téléchargé ET migre physiquement le fichier
 * si celui-ci est trouvé dans une ancienne structure (Téléportation).
 */
export const isTrackDownloaded = async (track) => {
  if (!track || !track.id) return false;
  
  const targetPath = getTrackPath(track);
  
  try {
    // 1. Vérification au chemin cible (Nouveau système : ID Album)
    const targetInfo = await FileSystem.getInfoAsync(targetPath);
    if (targetInfo.exists) return true;

    // 2. Moteur de Téléportation : Recherche dans les anciennes structures
    const oldPaths = [
      `${DOWNLOAD_DIR}${track.id}.mp3`, // Ancienne structure : Racine
      track.album?.title ? `${DOWNLOAD_DIR}${sanitize(track.album.title)}/${track.id}.mp3` : null // Ancienne structure : Titre Album
    ].filter(Boolean);

    for (const oldPath of oldPaths) {
      const oldInfo = await FileSystem.getInfoAsync(oldPath);
      if (oldInfo.exists) {
        console.log(`[Downloader] Téléportation détectée : ${track.id} (${oldPath} -> ${targetPath})`);
        
        // Créer le dossier parent si nécessaire
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf('/') + 1);
        await ensureDir(parentDir);

        // Déplacement physique du fichier
        await FileSystem.moveAsync({
          from: oldPath,
          to: targetPath
        });

        // Mise à jour des métadonnées dans AsyncStorage
        const downloads = await getDownloadMetadata();
        const index = downloads.findIndex(d => String(d.id) === String(track.id));
        
        if (index !== -1) {
          downloads[index].localUri = targetPath;
          // Si on a un artwork, on pourrait aussi le migrer ici si besoin
          await saveDownloadMetadata(downloads);
        }

        return true;
      }
    }
  } catch (e) {
    console.error('[Downloader] Erreur lors de la vérification/migration :', e);
  }
  
  return false;
};

export const startDownload = async (track, downloadUrl, onProgress) => {
  await ensureDir();
  
  const targetPath = getTrackPath(track);
  const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/') + 1);
  await ensureDir(targetDir);

  const downloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    targetPath,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      if (onProgress) onProgress(progress);
    }
  );

  try {
    const { uri } = await downloadResumable.downloadAsync();
    
    // Télécharger aussi l'artwork pour le mode hors-ligne (stocké à la racine pour l'instant)
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
      artwork: localArtwork || artworkUrl,
      downloadedAt: new Date().toISOString()
    };
    
    await saveDownloadMetadata([newDownload, ...downloads]);
    return newDownload;
  } catch (e) {
    console.error('Download error:', e);
    throw e;
  }
};

export const deleteDownload = async (track) => {
  if (!track) return;

  // Supporte le cas où on passe uniquement un ID (string ou number)
  let trackObj = track;
  const trackId = typeof track === 'object' ? track.id : track;

  if (typeof track !== 'object' || !track.album) {
    // On récupère les métadonnées complètes depuis AsyncStorage pour avoir l'album.id
    const downloads = await getDownloadMetadata();
    const found = downloads.find(d => String(d.id) === String(trackId));
    if (found) trackObj = found;
  }

  const fileUri = getTrackPath(trackObj);
  const artworkUri = `${DOWNLOAD_DIR}thumb_${trackId}.jpg`;

  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    await FileSystem.deleteAsync(artworkUri, { idempotent: true });

    const downloads = await getDownloadMetadata();
    const filtered = downloads.filter(d => String(d.id) !== String(trackId));
    await saveDownloadMetadata(filtered);
  } catch (e) {
    console.error('Delete error:', e);
  }
};
