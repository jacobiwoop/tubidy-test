const express = require("express");
const router = express.Router();
const ytmusicService = require("../services/ytmusic.service");

// @route   GET /api/ytmusic/search
// @desc    Search YouTube Music (compat format)
router.get("/search", async (req, res, next) => {
  try {
    const { q, filter = "songs", limit = 20 } = req.query;
    if (!q)
      return res.status(400).json({ error: "Missing query parameter: q" });

    const rawResults = await ytmusicService.search(q, filter, limit);

    // Mapper pour compatibilité avec le frontend (qui attendait du Deezer)
    const mappedResults = rawResults.map((item) => ({
      id: item.videoId,
      title: item.title,
      artist: {
        id: item.artists?.[0]?.id || null,
        name: item.artists?.[0]?.name || "Unknown Artist",
      },
      album: {
        id: item.album?.id || null,
        title: item.album?.name || null,
        cover_small: item.thumbnails?.[0]?.url || "",
        cover_medium:
          item.thumbnails?.[1]?.url || item.thumbnails?.[0]?.url || "",
      },
      duration: item.duration_seconds || 0,
      type: "track",
      source: "ytmusic",
    }));

    res.json({ data: mappedResults });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/ytmusic/song/:id
// @desc    Get song details
router.get("/song/:id", async (req, res, next) => {
  try {
    const result = await ytmusicService.getSong(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/ytmusic/artist/:id
// @desc    Get artist details
router.get("/artist/:id", async (req, res, next) => {
  try {
    const result = await ytmusicService.getArtist(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
