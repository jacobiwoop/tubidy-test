const express = require("express");
const router = express.Router();
const playlistService = require("../services/playlist.service");

// Récupérer toutes les playlists
router.get("/", async (req, res, next) => {
  try {
    const playlists = await playlistService.getAllPlaylists();
    res.json(playlists);
  } catch (err) {
    next(err);
  }
});

// Créer une playlist
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Missing name" });
    const result = await playlistService.createPlaylist(name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Supprimer une playlist
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await playlistService.deletePlaylist(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Récupérer une playlist avec ses titres
router.get("/:id", async (req, res, next) => {
  try {
    const playlist = await playlistService.getPlaylistWithTracks(req.params.id);
    if (!playlist) return res.status(404).json({ error: "Playlist not found" });
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

// Ajouter un titre à une playlist
router.post("/:id/tracks", async (req, res, next) => {
  try {
    const trackData = req.body;
    if (!trackData.id)
      return res.status(400).json({ error: "Missing track id" });

    const result = await playlistService.addTrackToPlaylist(
      req.params.id,
      trackData,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Supprimer des titres d'une playlist (Vrac)
router.delete("/:id/tracks", async (req, res, next) => {
  try {
    const { trackIds } = req.body;
    if (!trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({ error: "Missing or invalid trackIds" });
    }
    const result = await playlistService.deleteTracksFromPlaylist(
      req.params.id,
      trackIds,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
