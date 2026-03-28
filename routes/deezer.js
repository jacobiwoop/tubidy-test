const express = require("express");
const router = express.Router();
const deezerService = require("../services/deezer.service");

router.get("/search", async (req, res, next) => {
  try {
    const { q, index = 0, limit = 25, order = "RANKING" } = req.query;
    if (!q)
      return res.status(400).json({ error: "Missing query parameter: q" });

    const result = await deezerService.search(q, { index, limit, order });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/artist", async (req, res, next) => {
  try {
    const { q, index = 0, limit = 25 } = req.query;
    if (!q)
      return res.status(400).json({ error: "Missing query parameter: q" });

    const result = await deezerService.searchArtist(q, { index, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/album", async (req, res, next) => {
  try {
    const { q, index = 0, limit = 25 } = req.query;
    if (!q)
      return res.status(400).json({ error: "Missing query parameter: q" });

    const result = await deezerService.searchAlbum(q, { index, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/track/:id", async (req, res, next) => {
  try {
    const result = await deezerService.getTrack(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
