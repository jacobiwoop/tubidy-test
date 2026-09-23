const express = require("express");
const router = express.Router();

/**
 * Route /api/stream/:id
 *
 * FIX : cette route était un stub vide qui renvoyait juste un JSON inutile.
 *
 * Le streaming audio est géré directement par le téléphone (RNTP → d2mefast.net).
 * Cette route n'est donc PAS nécessaire pour la lecture.
 *
 * Elle est conservée ici comme endpoint informatif qui confirme que le serveur
 * tourne et indique comment fonctionne le streaming.
 *
 * Si tu veux implémenter un vrai proxy audio plus tard (pour masquer d2mefast,
 * gérer l'expiration des liens, ou garantir le seek), c'est ici que ça se passe
 * en utilisant la fonction proxyAudio() déjà présente dans app.js.
 */
const { execFile } = require("child_process");

/**
 * Route GET /api/stream/resolve?q=titre+artiste
 * Résout le lien audio direct via yt-dlp haute vitesse et renvoie l'URL du flux.
 */
router.get("/resolve", (req, res, next) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Paramètre 'q' requis" });

  const searchQuery = query.startsWith("http") ? query : `ytsearch1:${query} audio`;
  console.log(`[stream-resolve] Resolving audio for: ${searchQuery}`);

  execFile(
    "yt-dlp",
    ["-f", "ba/b", "--no-warnings", "--no-playlist", "--geo-bypass", "--get-url", searchQuery],
    { timeout: 15000 },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`[stream-resolve] Error: ${error.message}`);
        return res.status(500).json({ error: "Échec de résolution audio", details: stderr });
      }

      const url = stdout.trim().split("\n")[0];
      if (!url || !url.startsWith("http")) {
        return res.status(404).json({ error: "Aucun flux audio trouvé" });
      }

      console.log(`[stream-resolve] Success! Resolved: ${url.substring(0, 60)}...`);
      res.json({
        url,
        source: "YouTube HQ",
        quality: "Audio HQ (Complet)",
      });
    }
  );
});

router.get("/:id", async (req, res, next) => {
  try {
    res.json({
      message: "Le streaming audio est géré directement par le client.",
      info: "Pour obtenir un flux audio, utilisez GET /api/stream/resolve?q=...",
      id: req.params.id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
