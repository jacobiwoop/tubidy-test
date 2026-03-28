const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "../music.db");
const db = new Database(dbPath);

// Configuration de la base de données
db.pragma("journal_mode = WAL");

/**
 * Initialisation des tables
 */
function initDB() {
  // Table des titres (cache métadonnées)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      cover_url TEXT,
      preview_url TEXT,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  ).run();

  // Table des titres aimés (Likes)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS likes (
      track_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    )
  `,
  ).run();

  // Table des playlists
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  ).run();

  // Table de jonction Playlist <-> Tracks
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT,
      track_id TEXT,
      position INTEGER,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    )
  `,
  ).run();

  // Table de cache des flux audio (Spotiwoop / Tubidy)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS stream_cache (
      deezer_id TEXT PRIMARY KEY,
      stream_url TEXT NOT NULL,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  ).run();

  console.log("[db] Database initialized successfully.");
}

initDB();

module.exports = db;
