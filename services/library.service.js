const db = require("../config/database");

/**
 * Service pour gérer les Titres Aimés (Likes)
 */

/**
 * Ajoute ou met à jour un titre dans le cache global
 * @param {object} trackData
 */
function upsertTrack(trackData) {
  const stmt = db.prepare(`
    INSERT INTO tracks (id, title, artist, album, cover_url, preview_url, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      album=excluded.album,
      cover_url=excluded.cover_url,
      preview_url=excluded.preview_url,
      duration=excluded.duration
  `);

  stmt.run(
    trackData.id.toString(),
    trackData.title,
    trackData.artist.name || trackData.artist,
    trackData.album?.title || trackData.album || "",
    trackData.album?.cover_medium || trackData.cover_url || "",
    trackData.preview || trackData.preview_url || "",
    trackData.duration || 0,
  );
}

/**
 * Ajoute un titre aux favoris
 */
async function likeTrack(trackData) {
  try {
    // 1. S'assurer que le titre est dans la table tracks
    upsertTrack(trackData);

    // 2. Ajouter le Like
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO likes (track_id) VALUES (?)",
    );
    stmt.run(trackData.id.toString());

    return { success: true, message: "Track liked" };
  } catch (error) {
    console.error("[library] Error in likeTrack:", error.message);
    throw error;
  }
}

/**
 * Retire un titre des favoris
 */
async function unlikeTrack(trackId) {
  try {
    const stmt = db.prepare("DELETE FROM likes WHERE track_id = ?");
    stmt.run(trackId.toString());
    return { success: true, message: "Track unliked" };
  } catch (error) {
    console.error("[library] Error in unlikeTrack:", error.message);
    throw error;
  }
}

/**
 * Récupère tous les titres aimés avec leurs métadonnées
 */
async function getLikedTracks() {
  try {
    const stmt = db.prepare(`
      SELECT t.*, l.created_at as liked_at
      FROM tracks t
      JOIN likes l ON t.id = l.track_id
      ORDER BY l.created_at DESC
    `);
    return stmt.all();
  } catch (error) {
    console.error("[library] Error in getLikedTracks:", error.message);
    throw error;
  }
}

module.exports = {
  likeTrack,
  unlikeTrack,
  getLikedTracks,
  upsertTrack, // Exporté car utile pour les playlists aussi
};
