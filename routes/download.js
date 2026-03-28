const express = require("express");
const router = express.Router();
const tubidyService = require("../services/tubidy.service");

router.get("/", async (req, res, next) => {
  try {
    const videoUrl = req.query.url;
    const format = req.query.format || "mp3";

    if (!videoUrl) {
      return res.status(400).json({ error: "Le paramètre 'url' est requis." });
    }

    // Appel du service pour obtenir le vrai lien de téléchargement
    const downloadData = await tubidyService.getDownloadLink(videoUrl, format);

    res.json({
      status: "success",
      url: videoUrl,
      format,
      link: downloadData.link,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
