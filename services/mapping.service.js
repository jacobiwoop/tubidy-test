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
async function getTubidyDownloadByDeezerId(deezerId, format = "mp3") {
  try {
    // 0. Vérifier le cache local (valide pour 24 heures)
    const cached = db
      .prepare(
        `
      SELECT * FROM stream_cache 
      WHERE deezer_id = ? AND created_at > datetime('now', '-1 day')
    `,
      )
      .get(deezerId);

    if (cached) {
      console.log(`[mapping] Cache hit pour Deezer ID: ${deezerId}`);
      return {
        source: { id: deezerId }, // Infos source minimales ok pour le lecteur
        target: {
          title: cached.title,
          link: cached.stream_url,
          format: format === "video" ? "MP4 video" : "MP3 audio",
          cached: true,
        },
      };
    }

    // 1. Récupérer les infos du titre sur Deezer
    console.log(`[mapping] Récupération infos Deezer pour ID: ${deezerId}`);
    const track = await deezerService.getTrack(deezerId);
    if (!track || track.error) {
      throw new Error("Titre introuvable sur Deezer");
    }

    const query = `${track.artist.name} ${track.title}`;
    console.log(`[mapping] Recherche Tubidy pour: "${query}"`);

    // 2. Chercher sur Tubidy
    const { results } = await tubidyService.search(query, { page: 1 });

    if (!results || results.length === 0) {
      throw new Error(
        `Aucun résultat correspondant sur Tubidy pour "${query}"`,
      );
    }

    // 3. Prendre le meilleur match (le premier résultat du scraper)
    const bestMatch = results[0];
    console.log(`[mapping] Match trouvé sur Tubidy: ${bestMatch.title}`);

    // 4. Obtenir le lien de téléchargement final
    const downloadData = await tubidyService.getDownloadLink(
      bestMatch.download_page,
      format,
    );

    // 5. Sauvegarder dans le cache
    db.prepare(
      `
      INSERT OR REPLACE INTO stream_cache (deezer_id, stream_url, title)
      VALUES (?, ?, ?)
    `,
    ).run(deezerId, downloadData.link, bestMatch.title);

    return {
      source: {
        id: deezerId,
        title: track.title,
        artist: track.artist.name,
        thumbnail: track.album.cover_medium,
      },
      target: {
        title: bestMatch.title,
        link: downloadData.link,
        format: format === "video" ? "MP4 video" : "MP3 audio",
      },
    };
  } catch (error) {
    console.error("[mapping] Error:", error.message);
    throw error;
  }
}

module.exports = {
  getTubidyDownloadByDeezerId,
};
