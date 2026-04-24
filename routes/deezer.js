const express = require("express");
const router = express.Router();
const deezerService = require("../services/deezer.service");
const mappingService = require("../services/mapping.service");

router.get("/search", async (req, res, next) => {
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const { q, index = 0, limit = 25, order = "RANKING" } = req.query;
    if (!q)
      return res.status(400).json({ error: "Missing query parameter: q" });

    const result = await deezerService.search(
      q,
      { index, limit, order },
      controller.signal,
    );
    res.json(result);
  } catch (err) {
    if (controller.signal.aborted) {
      console.log(
        `[api] Search request aborted by client for query: ${req.query.q}`,
      );
      return;
    }
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

router.get("/track/:id/download", async (req, res, next) => {
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const { format = "mp3" } = req.query;
    const result = await mappingService.getTubidyDownloadByDeezerId(
      req.params.id,
      format,
      controller.signal,
    );
    res.json(result);
  } catch (err) {
    if (controller.signal.aborted) {
      console.log(
        `[api] Download request aborted by client for ID: ${req.params.id}`,
      );
      return;
    }
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

router.get("/genre/:id", async (req, res, next) => {
  try {
    const result = await deezerService.getGenre(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/genre/:id/artists", async (req, res, next) => {
  try {
    const result = await deezerService.getGenreArtists(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/genre/:id/playlists", async (req, res, next) => {
  try {
    const result = await deezerService.getGenrePlaylists(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/genre/:id/tracks", async (req, res, next) => {
  try {
    const result = await deezerService.getGenreTracks(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/genre/:id/releases", async (req, res, next) => {
  try {
    const result = await deezerService.getGenreReleases(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/artist/:id", async (req, res, next) => {
  try {
    const result = await deezerService.getArtist(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/artist/:id/top", async (req, res, next) => {
  try {
    const result = await deezerService.getArtistTopTracks(req.params.id, {
      limit: req.query.limit || 10,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/artist/:id/albums", async (req, res, next) => {
  try {
    const result = await deezerService.getArtistAlbums(req.params.id, {
      limit: req.query.limit || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/artist/:id/related", async (req, res, next) => {
  try {
    const result = await deezerService.getRelatedArtists(req.params.id, {
      limit: req.query.limit || 10,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/album/:id", async (req, res, next) => {
  try {
    const result = await deezerService.getAlbum(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/album/:id/related", async (req, res, next) => {
  try {
    const result = await deezerService.getRelatedAlbums(req.params.id, {
      limit: req.query.limit || 6,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/track/:id/radio", async (req, res, next) => {
  try {
    const result = await deezerService.getTrackRadio(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
