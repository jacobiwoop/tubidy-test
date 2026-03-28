const express = require("express");
const router = express.Router();
const libraryService = require("../services/library.service");

// Récupérer tous les titres aimés
router.get("/", async (req, res, next) => {
  try {
    const tracks = await libraryService.getLikedTracks();
    res.json(tracks);
  } catch (err) {
    next(err);
  }
});

// Aimer un titre
router.post("/like", async (req, res, next) => {
  try {
    const trackData = req.body;
    if (!trackData.id)
      return res.status(400).json({ error: "Missing track id" });

    const result = await libraryService.likeTrack(trackData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Retirer des favoris
router.delete("/like/:id", async (req, res, next) => {
  try {
    const result = await libraryService.unlikeTrack(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
