const db = require("../config/database");
const { upsertTrack } = require("./library.service");

/**
 * Service pour gérer les Playlists
 */

/**
 * Crée une nouvelle playlist
 * @param {string} name
 */
async function createPlaylist(name) {
  try {
    const id = Date.now().toString(); // ID simple basé sur le timestamp
    const stmt = db.prepare("INSERT INTO playlists (id, name) VALUES (?, ?)");
    stmt.run(id, name);
    return { id, name, created_at: new Date() };
  } catch (error) {
    console.error("[playlist] Error in createPlaylist:", error.message);
    throw error;
  }
}

/**
 * Supprime une playlist
 */
async function deletePlaylist(id) {
  try {
    const stmt = db.prepare("DELETE FROM playlists WHERE id = ?");
    stmt.run(id);
    return { success: true };
  } catch (error) {
    console.error("[playlist] Error in deletePlaylist:", error.message);
    throw error;
  }
}

/**
 * Récupère toutes les playlists
 */
async function getAllPlaylists() {
  try {
    const stmt = db.prepare("SELECT * FROM playlists ORDER BY created_at DESC");
    return stmt.all();
  } catch (error) {
    console.error("[playlist] Error in getAllPlaylists:", error.message);
    throw error;
  }
}

/**
 * Ajoute un titre à une playlist
 */
async function addTrackToPlaylist(playlistId, trackData) {
  try {
    // 1. S'assurer que le titre est dans la table tracks
    upsertTrack(trackData);

    // 2. Calculer la position (dernier + 1)
    const posStmt = db.prepare(
      "SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = ?",
    );
    const row = posStmt.get(playlistId);
    const position = (row.max_pos || 0) + 1;

    // 3. Ajouter le lien
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
    );
    stmt.run(playlistId, trackData.id.toString(), position);

    return { success: true, position };
  } catch (error) {
    console.error("[playlist] Error in addTrackToPlaylist:", error.message);
    throw error;
  }
}

/**
 * Récupère une playlist avec ses titres
 */
async function getPlaylistWithTracks(id) {
  try {
    const playlist = db.prepare("SELECT * FROM playlists WHERE id = ?").get(id);
    if (!playlist) return null;

    const tracks = db
      .prepare(
        `
      SELECT t.*, pt.position, pt.added_at
      FROM tracks t
      JOIN playlist_tracks pt ON t.id = pt.track_id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position ASC
    `,
      )
      .all(id);

    playlist.tracks = tracks;
    return playlist;
  } catch (error) {
    console.error("[playlist] Error in getPlaylistWithTracks:", error.message);
    throw error;
  }
}

module.exports = {
  createPlaylist,
  deletePlaylist,
  getAllPlaylists,
  addTrackToPlaylist,
  getPlaylistWithTracks,
};
