const deezerService = require("./deezer.service");
const tubidyService = require("./tubidy.service");
const tubidyCoolService = require("./tubidy.cool.service");
const db = require("../config/database");
const axios = require("axios");

// ─── Cache mémoire pour les liens MP3 finaux (TTL 10 min) ────────────────────
// Les liens d2mefast.net expirent, donc on ne les garde pas trop longtemps.
const linkCache = new Map();
const LINK_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedLink(key) {
  const entry = linkCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    linkCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedLink(key, data) {
  linkCache.set(key, { data, expiresAt: Date.now() + LINK_CACHE_TTL });
}

/**
 * Nettoie le titre pour éviter les caractères spéciaux
 */
function cleanQuery(text) {
  if (!text) return "";
  return text
    .replace(/[^\w\sàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Récupère un lien de téléchargement Tubidy à partir d'un identifiant Deezer.
 *
 * FIXES appliqués :
 * - Suppression de isLinkReachable() après le turbo (HEAD request inutile ~400ms)
 * - Cache mémoire TTL 10min sur le lien final MP3
 * - Timeout explicite sur l'appel Deezer (8s)
 * - Promise.race simplifié et correct
 * - isLinkReachable conservé uniquement dans le fallback (liens moins fiables)
 */
async function getTubidyDownloadByDeezerId(deezerId, format = "mp3", signal = null) {
  try {
    // ── 0. Cache du lien final ──────────────────────────────────────────────
    const cacheKey = `${deezerId}:${format}`;
    const cached = getCachedLink(cacheKey);
    if (cached) {
      console.log(`[mapping] Cache hit pour ID: ${deezerId}`);
      return cached;
    }

    // ── 1. Infos Deezer (cache SQLite intégré dans deezer.service) ──────────
    console.log(`[mapping] Récupération infos Deezer pour ID: ${deezerId}`);
    const track = await Promise.race([
      deezerService.getTrack(deezerId, signal),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Deezer timeout")), 8000)
      ),
    ]);
    if (!track || track.error) throw new Error("Titre introuvable sur Deezer");

    // ── 2. TURBO : Tubidy.cool ──────────────────────────────────────────────
    // FIX : on supprime isLinkReachable() ici — le lien vient d'être extrait
    // dynamiquement, il est forcément valide. Le HEAD request ajoutait ~400ms.
    console.log(`[mapping] Tentative Turbo avec Tubidy.cool...`);
    try {
      const turboResult = await tubidyCoolService.findBestDirectLink(
        track.title,
        track.artist.name
      );
      if (turboResult?.link) {
        console.log(`[mapping] Succès Turbo !`);
        const result = {
          source: {
            id: deezerId,
            title: track.title,
            artist: track.artist.name,
            thumbnail: track.album.cover_medium,
          },
          target: {
            title: turboResult.title,
            link: turboResult.link,
            format: "MP3 audio",
            size: turboResult.size,
          },
        };
        setCachedLink(cacheKey, result);
        return result;
      }
    } catch (turboErr) {
      console.warn(`[mapping] Échec Turbo: ${turboErr.message}`);
    }

    // ── 3. FALLBACK : Tubidy.com classique ──────────────────────────────────
    console.log(`[mapping] Passage au mode Fallback...`);
    let tubidyPageUrl = null;
    try {
      const row = db
        .prepare("SELECT tubidy_url FROM tubidy_mapping WHERE deezer_id = ?")
        .get(deezerId);
      if (row) tubidyPageUrl = row.tubidy_url;
    } catch (_) {}

    let results = [];
    if (tubidyPageUrl) {
      results = [{ download_page: tubidyPageUrl, title: track.title }];
    } else {
      const query = `${cleanQuery(track.artist.name)} ${cleanQuery(track.title)}`;
      const searchRes = await tubidyService.search(query, { page: 1 }, signal);
      results = searchRes.results;
    }

    if (!results || results.length === 0)
      throw new Error("Aucun résultat sur Tubidy");

    // FIX : Promise.race propre — on lance les 3 en parallèle et on prend
    // le premier qui réussit. Si tous échouent → Promise.all pour récupérer
    // les erreurs et lever une exception claire.
    const candidates = results.slice(0, 3);

    const raceResult = await new Promise(async (resolve, reject) => {
      let failures = 0;
      for (const match of candidates) {
        (async () => {
          try {
            const dl = await tubidyService.getDownloadLink(
              match.download_page,
              format,
              signal
            );
            if (!dl?.link) throw new Error("Pas de lien");

            // isLinkReachable conservé ici car les liens Tubidy.com
            // sont moins fiables que ceux de Tubidy.cool
            const head = await axios.head(dl.link, { timeout: 4000 }).catch(() =>
              axios.get(dl.link, {
                timeout: 4000,
                headers: { Range: "bytes=0-0" },
              })
            );

            // Mise en cache SQLite de la page Tubidy (pas du lien, il expire)
            if (!tubidyPageUrl) {
              try {
                db.prepare(
                  "INSERT OR REPLACE INTO tubidy_mapping (deezer_id, tubidy_url, title) VALUES (?, ?, ?)"
                ).run(deezerId, match.download_page, match.title);
              } catch (_) {}
            }

            const result = {
              source: {
                id: deezerId,
                title: track.title,
                artist: track.artist.name,
                thumbnail: track.album.cover_medium,
              },
              target: {
                title: match.title,
                link: dl.link,
                format: format === "video" ? "MP4 video" : "MP3 audio",
              },
            };
            setCachedLink(cacheKey, result);
            resolve(result);
          } catch (e) {
            failures++;
            if (failures === candidates.length) {
              reject(new Error("Aucun lien Tubidy valide n'a pu être extrait."));
            }
          }
        })();
      }
    });

    return raceResult;
  } catch (error) {
    console.error("[mapping] Error:", error.message);
    throw error;
  }
}

/**
 * Lien direct par requête textuelle (utilisé pour les suggestions Last.fm)
 *
 * FIXES : suppression de isLinkReachable() après turbo, cache TTL 10min
 */
async function getDirectLinkByQuery(query, format = "mp3", signal = null) {
  try {
    // ── Cache ───────────────────────────────────────────────────────────────
    const cacheKey = `query:${query}:${format}`;
    const cached = getCachedLink(cacheKey);
    if (cached) {
      console.log(`[mapping] Cache hit pour query: ${query}`);
      return cached;
    }

    // ── TURBO ────────────────────────────────────────────────────────────────
    console.log(`[mapping] Tentative Turbo pour: ${query}`);
    try {
      const turboResult = await tubidyCoolService.findBestDirectLink(query, "");
      if (turboResult?.link) {
        // FIX : pas de isLinkReachable() ici non plus
        const result = {
          title: turboResult.title,
          link: turboResult.link,
          format: "MP3 audio",
          source: "tubidy.cool",
        };
        setCachedLink(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.warn(`[mapping] Échec Turbo: ${e.message}`);
    }

    // ── FALLBACK ─────────────────────────────────────────────────────────────
    console.log(`[mapping] Fallback classique pour: ${query}`);
    const searchRes = await tubidyService.search(query, { page: 1 }, signal);
    const results = searchRes.results;

    if (!results || results.length === 0)
      throw new Error("Aucun résultat sur Tubidy");

    const match = results[0];
    const dl = await tubidyService.getDownloadLink(match.download_page, format, signal);

    if (!dl?.link) throw new Error("Impossible d'extraire le lien");

    const result = {
      title: match.title,
      link: dl.link,
      format: format === "video" ? "MP4 video" : "MP3 audio",
      source: "tubidy",
    };
    setCachedLink(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[mapping] Error DirectLinkByQuery:", error.message);
    throw error;
  }
}

module.exports = { getTubidyDownloadByDeezerId, getDirectLinkByQuery };
