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
async function isLinkReachable(url) {
  try {
    // On fait un HEAD pour gagner du temps
    await axios.head(url, { timeout: 2500 });
    return true;
  } catch (err) {
    // Si HEAD échoue, on tente un GET partiel au cas où HEAD soit bloqué
    try {
      await axios.get(url, {
        timeout: 2500,
        headers: { Range: "bytes=0-0" },
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
async function getTubidyDownloadByDeezerId(deezerId, format = "mp3") {
  try {
    // 1. Récupérer les infos du titre sur Deezer
    console.log(`[mapping] Récupération infos Deezer pour ID: ${deezerId}`);
    const track = await deezerService.getTrack(deezerId);
    if (!track || track.error) {
      throw new Error("Titre introuvable sur Deezer");
    }

    // 2. Nettoyer et préparer la recherche
    const artistClean = cleanQuery(track.artist.name);
    const titleClean = cleanQuery(track.title);
    const query = `${artistClean} ${titleClean}`;
    console.log(`[mapping] Recherche Tubidy pour: "${query}"`);

    // 3. Chercher sur Tubidy
    const { results } = await tubidyService.search(query, { page: 1 });

    if (!results || results.length === 0) {
      throw new Error(
        `Aucun résultat correspondant sur Tubidy pour "${query}"`,
      );
    }

    // 4. Boucle de Fallback : on teste les 3 premiers résultats si besoin
    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const match = results[i];
      console.log(
        `[mapping] Test du lien ${i + 1}/${Math.min(results.length, 3)}: ${match.title}`,
      );

      try {
        const downloadData = await tubidyService.getDownloadLink(
          match.download_page,
          format,
        );

        if (!downloadData.link) continue;

        // Vérification de connectivité
        console.log(`[mapping] Vérification connectivité pour: ${match.title}`);
        const alive = await isLinkReachable(downloadData.link);

        if (alive) {
          console.log(`[mapping] Link ${i + 1} est OK!`);
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
        } else {
          console.warn(
            `[mapping] Link ${i + 1} (Timeout/Erreur). Passage au suivant...`,
          );
        }
      } catch (innerError) {
        console.warn(
          `[mapping] Erreur sur le lien ${i + 1}: ${innerError.message}`,
        );
      }
    }

    throw new Error(
      "Désolé, aucun des liens Tubidy n'a répondu. Réessaie plus tard.",
    );
  } catch (error) {
    console.error("[mapping] Error Mapping:", error.message);
    throw error;
  }
}

module.exports = {
  getTubidyDownloadByDeezerId,
};
