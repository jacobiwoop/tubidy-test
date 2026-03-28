import { get, set } from "idb-keyval";

const STORE_KEY = "spotiwoop_downloads";

/**
 * Récupère toutes les métadonnées des musiques téléchargées.
 */
export async function getDownloadedTracks() {
  try {
    const tracks = await get(STORE_KEY);
    return tracks || [];
  } catch (err) {
    console.error("Erreur lecture IndexedDB :", err);
    return [];
  }
}

/**
 * Sauvegarde les informations texte et image d'une musique.
 * @param {Object} track - L'objet musique complet
 */
export async function saveTrackMetadata(track) {
  try {
    const tracks = await getDownloadedTracks();
    if (!tracks.find((t) => t.id === track.id)) {
      tracks.unshift(track); // On ajoute au début de la liste
      await set(STORE_KEY, tracks);
    }
  } catch (err) {
    console.error("Erreur sauvegarde IndexedDB :", err);
  }
}

/**
 * Supprime les métadonnées si l'utilisateur supprime le téléchargement.
 * @param {string|number} trackId - L'ID de la musique
 */
export async function removeTrackMetadata(trackId) {
  try {
    const tracks = await getDownloadedTracks();
    const newTracks = tracks.filter((t) => t.id !== trackId);
    await set(STORE_KEY, newTracks);
  } catch (err) {
    console.error("Erreur suppression IndexedDB :", err);
  }
}

/**
 * Vérifie rapidement si la musique est enregistrée en local.
 */
export async function isTrackDownloaded(trackId) {
  try {
    const tracks = await getDownloadedTracks();
    return tracks.some((t) => t.id === trackId);
  } catch (err) {
    return false;
  }
}
