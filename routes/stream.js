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
const tubidyCool = require("../services/tubidy.cool.service");

// Cache mémoire des flux résolus (TTL: 30 minutes)
const streamCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCachedStream(key) {
  const item = streamCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    streamCache.delete(key);
    return null;
  }
  return item.data;
}

function setCachedStream(key, data) {
  // Limite la taille du cache à 500 éléments
  if (streamCache.size > 500) {
    const firstKey = streamCache.keys().next().value;
    streamCache.delete(firstKey);
  }
  streamCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Route GET /api/stream/resolve?q=titre+artiste
 * Résolution multi-sources haute vitesse :
 * 1. Cache mémoire (0 ms)
 * 2. SoundCloud HQ direct (1-2 s)
 * 3. YouTube HQ en secours (si pas de DRM ou morceau spécifique)
 * 4. Tubidy direct MP3
 */
router.get("/resolve", async (req, res, next) => {
  const query = req.query.q ? req.query.q.trim() : "";
  if (!query) return res.status(400).json({ error: "Paramètre 'q' requis" });

  const cacheKey = query.toLowerCase();
  const cached = getCachedStream(cacheKey);
  if (cached) {
    console.log(`[stream-resolve] Cache hit pour '${query}' -> ${cached.source}`);
    return res.json(cached);
  }

  console.log(`[stream-resolve] Recherche multi-sources pour: '${query}'`);

  const execYtDlp = (args, timeoutMs = 10000) => {
    return new Promise((resolve) => {
      execFile("yt-dlp", args, { timeout: timeoutMs }, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split("\n").filter((l) => l.startsWith("http"));
          if (lines.length > 0) return resolve(lines[0]);
        }
        resolve(null);
      });
    });
  };

  // Si c'est déjà une URL directe
  if (query.startsWith("http")) {
    const url = await execYtDlp([
      "-i", "-f", "ba/b", "--no-warnings", "--no-playlist", "--geo-bypass", "--get-url", query
    ], 12000);
    if (url) {
      const result = { url, source: "Direct Link", quality: "Audio HQ (Complet)" };
      setCachedStream(cacheKey, result);
      return res.json(result);
    }
  }

  // Étape 1 : SoundCloud HQ en priorité absolue (ultra-rapide, aucun captcha sur Render)
  try {
    const scUrl = await execYtDlp([
      "-i",
      "-f", "ba/b",
      "--no-warnings",
      "--no-playlist",
      "--geo-bypass",
      "--match-filter", "!is_drm",
      "--get-url",
      `scsearch3:${query}`,
    ], 8000);

    if (scUrl) {
      console.log(`[stream-resolve] Succès SoundCloud HQ (1-2s) pour '${query}'`);
      const result = {
        url: scUrl,
        source: "SoundCloud HQ",
        quality: "AAC/MP3 (Complet)",
      };
      setCachedStream(cacheKey, result);
      return res.json(result);
    }
  } catch (e) {
    console.warn(`[stream-resolve] Échec SoundCloud: ${e.message}`);
  }

  // Étape 2 : Secours YouTube HQ
  try {
    console.log(`[stream-resolve] SoundCloud non concluant, tentative YouTube pour '${query}'...`);
    const ytUrl = await execYtDlp([
      "-i",
      "-f", "ba/b",
      "--no-warnings",
      "--no-playlist",
      "--geo-bypass",
      "--get-url",
      `ytsearch1:${query} audio`,
    ], 10000);

    if (ytUrl) {
      console.log(`[stream-resolve] Succès YouTube HQ pour '${query}'`);
      const result = {
        url: ytUrl,
        source: "YouTube HQ",
        quality: "Audio HQ (Complet)",
      };
      setCachedStream(cacheKey, result);
      return res.json(result);
    }
  } catch (e) {
    console.warn(`[stream-resolve] Échec YouTube: ${e.message}`);
  }

  // Étape 3 : Secours Tubidy.cool MP3
  try {
    console.log(`[stream-resolve] Tentative Tubidy pour '${query}'...`);
    const tubidyResult = await tubidyCool.findBestDirectLink(query, "");
    if (tubidyResult && tubidyResult.link) {
      console.log(`[stream-resolve] Succès Tubidy MP3 pour '${query}'`);
      const result = {
        url: tubidyResult.link,
        source: "Tubidy MP3",
        quality: "MP3 Direct",
      };
      setCachedStream(cacheKey, result);
      return res.json(result);
    }
  } catch (e) {
    console.warn(`[stream-resolve] Échec Tubidy: ${e.message}`);
  }

  console.error(`[stream-resolve] Aucune source disponible pour '${query}'`);
  return res.status(404).json({ error: "Aucun flux audio disponible pour ce titre" });
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
