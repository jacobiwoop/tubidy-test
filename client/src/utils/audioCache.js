export const AUDIO_CACHE_NAME = "spotiwoop-audio-cache-v1";

/**
 * Télécharge physiquement le flux MP3 de la musique et l'injecte dans le CacheStorage du navigateur.
 * @param {string} previewUrl - L'url du fichier audio/MP3
 * @returns {Promise<boolean>} - True si sauvegardé avec succès
 */
export async function cacheAudioFile(previewUrl, onProgress) {
  if (!previewUrl) return false;

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);

    const proxyUrl = previewUrl.startsWith("/api/proxy-audio")
      ? previewUrl
      : `/api/proxy-audio?url=${encodeURIComponent(previewUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) return false;

    // Pour le suivi de la progression
    const contentLength = +(response.headers.get("Content-Length") || 0);
    if (!contentLength || !onProgress) {
      await cache.put(previewUrl, response);
      return true;
    }

    // Lecture par flux pour suivre la progression
    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      receivedLength += value.length;
      onProgress(Math.round((receivedLength / contentLength) * 100));
    }

    const blob = new Blob(chunks);
    await cache.put(
      previewUrl,
      new Response(blob, {
        headers: response.headers,
      }),
    );

    return true;
  } catch (error) {
    console.error("Failed to cache audio blob:", error);
    return false;
  }
}

/**
 * Supprime un fichier audio du téléphone pour libérer de la mémoire.
 */
export async function removeCachedAudio(previewUrl) {
  if (!previewUrl) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    return await cache.delete(previewUrl);
  } catch (err) {
    console.error("Failed to delete cached audio blob:", err);
    return false;
  }
}

/**
 * Vérifie de manière synchrone/rapide si l'audio est existant dans CacheStorage.
 * Utile pour l'affichage des coches vertes dans l'UI.
 */
export async function isAudioCached(previewUrl) {
  if (!previewUrl) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(previewUrl);
    // Si response != undefined, la musique est physiquement dans l'ordinateur/téléphone !
    return !!response;
  } catch (err) {
    return false;
  }
}
