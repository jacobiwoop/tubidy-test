import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

export const AUDIO_CACHE_NAME = "spotiwoop-audio-cache-v1";
const MUSIC_DIR = "music";

/**
 * Télécharge et sauvegarde la musique dans le stockage permanent (Capacitor)
 * ou dans le cache du navigateur.
 */
export async function cacheAudioFile(trackId, previewUrl, onProgress) {
  if (!previewUrl || !trackId) return false;

  try {
    const proxyUrl = previewUrl.startsWith("/api/proxy-audio")
      ? previewUrl
      : `/api/proxy-audio?url=${encodeURIComponent(previewUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) return false;

    const contentLength = +(response.headers.get("Content-Length") || 0);
    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      if (onProgress && contentLength) {
        onProgress(Math.round((receivedLength / contentLength) * 100));
      }
    }

    const blob = new Blob(chunks);

    if (Capacitor.isNativePlatform()) {
      // --- MODE MOBILE (Filesystem) ---
      // Conversion du Blob en Base64 pour Filesystem
      const base64Data = await blobToBase64(blob);
      
      // On s'assure que le dossier existe
      try {
        await Filesystem.mkdir({
          path: MUSIC_DIR,
          directory: Directory.Data,
          recursive: true,
        });
      } catch (e) {}

      await Filesystem.writeFile({
        path: `${MUSIC_DIR}/${trackId}.mp3`,
        data: base64Data,
        directory: Directory.Data,
      });
    } else {
      // --- MODE NAVIGATEUR (CacheStorage) ---
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.put(
        previewUrl,
        new Response(blob, { headers: response.headers })
      );
    }

    return true;
  } catch (error) {
    console.error("Failed to cache audio:", error);
    return false;
  }
}

/**
 * Récupère l'URL de lecture (Locale si dispo, sinon Distante)
 */
export async function getAudioUri(trackId, previewUrl) {
  if (Capacitor.isNativePlatform()) {
    try {
      const file = await Filesystem.getUri({
        path: `${MUSIC_DIR}/${trackId}.mp3`,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(file.uri);
    } catch (e) {
      return previewUrl;
    }
  } else {
    const cached = await isAudioCached(trackId, previewUrl);
    return cached ? previewUrl : previewUrl; 
    // Le navigateur gère tout seul l'interception du cache si on utilise l'URL d'origine
  }
}

/**
 * Supprime une musique du stockage.
 */
export async function removeCachedAudio(trackId, previewUrl) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.deleteFile({
        path: `${MUSIC_DIR}/${trackId}.mp3`,
        directory: Directory.Data,
      });
    } else {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.delete(previewUrl);
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Vérifie si la musique est présente physiquement.
 */
export async function isAudioCached(trackId, previewUrl) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.stat({
        path: `${MUSIC_DIR}/${trackId}.mp3`,
        directory: Directory.Data,
      });
      return true;
    } catch (e) {
      return false;
    }
  } else {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const response = await cache.match(previewUrl);
      return !!response;
    } catch (e) {
      return false;
    }
  }
}

// Helper pour convertir Blob en Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
