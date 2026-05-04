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
router.get("/:id", async (req, res, next) => {
  try {
    res.json({
      message: "Le streaming audio est géré directement par le client (RNTP → d2mefast.net).",
      info: "Pour obtenir un lien audio, utilisez GET /api/deezer/track/:id/download",
      id: req.params.id,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
