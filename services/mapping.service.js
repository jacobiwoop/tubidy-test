const deezerService = require("./deezer.service");
const tubidyService = require("./tubidy.service");
const db = require("../config/database");

/**
 * Service de Mapping pour lier les différentes sources.
 */

/**
 * Récupère un lien de téléchargement Tubidy à partir d'un identifiant Deezer.
 * @param {string} deezerId
 * @param {string} format - 'mp3' ou 'video'
 */
const axios = require("axios");

/**
 * Nettoie le titre pour éviter les caractères spéciaux qui perturbent Tubidy (ex: Δ, Θ, [Official])
 */
function cleanQuery(text) {
  if (!text) return "";
  return text
    .replace(/[^\w\sàâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vérifie rapidement si un lien est "vivant" (timeout 2.5s)
 */
async function isLinkReachable(url, signal = null) {
  try {
    // On fait un HEAD pour gagner du temps
    await axios.head(url, { timeout: 2500, signal });
    return true;
  } catch (err) {
    // Si HEAD échoue, on tente un GET partiel au cas où HEAD soit bloqué
    try {
      await axios.get(url, {
        timeout: 2500,
        headers: { Range: "bytes=0-0" },
        signal,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Récupère un lien de téléchargement Tubidy à partir d'un identifiant Deezer.
 * @param {string} deezerId
 * @param {string} format - 'mp3' ou 'video'
 */
async function getTubidyDownloadByDeezerId(
  deezerId,
  format = "mp3",
  signal = null,
) {
  try {
    // 1. Récupérer les infos du titre sur Deezer
    console.log(`[mapping] Récupération infos Deezer pour ID: ${deezerId}`);
    const track = await deezerService.getTrack(deezerId, signal);
    if (!track || track.error) {
      throw new Error("Titre introuvable sur Deezer");
    }

    // 2. Vérifier le cache de mapping (Deezer ID -> Tubidy Page URL)
    let tubidyPageUrl = null;
    let cachedTitle = null;
    try {
      const cached = db
        .prepare(
          "SELECT tubidy_url, title FROM tubidy_mapping WHERE deezer_id = ?",
        )
        .get(deezerId);
      if (cached) {
        console.log(`[mapping-cache] Hit pour Deezer ID: ${deezerId}`);
        tubidyPageUrl = cached.tubidy_url;
        cachedTitle = cached.title;
      }
    } catch (dbErr) {
      console.warn("[mapping-cache] Read error:", dbErr.message);
    }

    let results = [];
    if (tubidyPageUrl) {
      // On simule un résultat pour réutiliser la boucle de test plus bas
      results = [
        { download_page: tubidyPageUrl, title: cachedTitle || track.title },
      ];
    } else {
      // 3. Sinon, chercher sur Tubidy
      const artistClean = cleanQuery(track.artist.name);
      const titleClean = cleanQuery(track.title);
      const query = `${artistClean} ${titleClean}`;
      console.log(`[mapping] Recherche Tubidy pour: "${query}"`);

      const searchRes = await tubidyService.search(query, { page: 1 }, signal);
      results = searchRes.results;
    }

    if (!results || results.length === 0) {
      throw new Error("Aucun résultat correspondant sur Tubidy");
    }

    // 4. Boucle de Test : on teste les résultats
    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const match = results[i];
      console.log(`[mapping] Test du lien ${i + 1}: ${match.title}`);

      try {
        const downloadData = await tubidyService.getDownloadLink(
          match.download_page,
          format,
          signal,
        );

        if (!downloadData.link) continue;

        // Vérification de connectivité
        console.log(`[mapping] Vérification connectivité pour: ${match.title}`);
        const alive = await isLinkReachable(downloadData.link, signal);

        if (alive) {
          console.log(`[mapping] Link ${i + 1} est OK!`);

          // S'il n'était pas en cache, on l'ajoute
          if (!tubidyPageUrl) {
            try {
              db.prepare(
                "INSERT OR REPLACE INTO tubidy_mapping (deezer_id, tubidy_url, title) VALUES (?, ?, ?)",
              ).run(deezerId, match.download_page, match.title);
            } catch (dbErr) {
              console.warn("[mapping-cache] Write error:", dbErr.message);
            }
          }

          return {
            source: {
              id: deezerId,
              title: track.title,
              artist: track.artist.name,
              thumbnail: track.album.cover_medium,
            },
            target: {
              title: match.title,
              link: downloadData.link,
              format: format === "video" ? "MP4 video" : "MP3 audio",
            },
          };
        }
      } catch (innerError) {
        console.warn(
          `[mapping] Erreur sur le lien ${i + 1}: ${innerError.message}`,
        );
      }
    }

    throw new Error("Aucun lien Tubidy valide n'a pu être extrait.");
  } catch (error) {
    console.error("[mapping] Error Mapping:", error.message);
    throw error;
  }
}

module.exports = {
  getTubidyDownloadByDeezerId,
};
