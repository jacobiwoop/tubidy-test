const deezerService = require("./deezer.service");
const tubidyService = require("./tubidy.service");
const tubidyCoolService = require("./tubidy.cool.service");
const db = require("../config/database");
const axios = require("axios");

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
 * Vérifie rapidement si un lien est "vivant"
 */
async function isLinkReachable(url, signal = null) {
  try {
    await axios.head(url, { timeout: 5000, signal });
    return true;
  } catch (err) {
    try {
      await axios.get(url, {
        timeout: 5000,
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
 */
async function getTubidyDownloadByDeezerId(deezerId, format = "mp3", signal = null) {
  try {
    // 1. Récupérer les infos Deezer
    console.log(`[mapping] Récupération infos Deezer pour ID: ${deezerId}`);
    const track = await deezerService.getTrack(deezerId, signal);
    if (!track || track.error) throw new Error("Titre introuvable sur Deezer");

    // 2. TENTATIVE TURBO (Tubidy.cool)
    console.log(`[mapping] Tentative Turbo avec Tubidy.cool...`);
    try {
      const turboResult = await tubidyCoolService.findBestDirectLink(track.title, track.artist.name);
      if (turboResult && turboResult.link) {
        const alive = await isLinkReachable(turboResult.link, signal);
        if (alive) {
          console.log(`[mapping] Succès Turbo ! Lien trouvé en < 2s`);
          return {
            source: { id: deezerId, title: track.title, artist: track.artist.name, thumbnail: track.album.cover_medium },
            target: { title: turboResult.title, link: turboResult.link, format: "MP3 audio", size: turboResult.size }
          };
        }
      }
    } catch (turboErr) {
      console.warn(`[mapping] Échec Turbo: ${turboErr.message}`);
    }

    // 3. FALLBACK (Ancien système avec cache et recherche classique)
    console.log(`[mapping] Passage au mode Fallback...`);
    let tubidyPageUrl = null;
    try {
      const cached = db.prepare("SELECT tubidy_url, title FROM tubidy_mapping WHERE deezer_id = ?").get(deezerId);
      if (cached) {
        tubidyPageUrl = cached.tubidy_url;
      }
    } catch (dbErr) {}

    let results = [];
    if (tubidyPageUrl) {
      results = [{ download_page: tubidyPageUrl, title: track.title }];
    } else {
      const query = `${cleanQuery(track.artist.name)} ${cleanQuery(track.title)}`;
      const searchRes = await tubidyService.search(query, { page: 1 }, signal);
      results = searchRes.results;
    }

    if (!results || results.length === 0) throw new Error("Aucun résultat sur Tubidy");

    // Test des 3 premiers résultats en parallèle
    const testPromises = results.slice(0, 3).map(async (match, i) => {
      try {
        const downloadData = await tubidyService.getDownloadLink(match.download_page, format, signal);
        if (!downloadData.link) return null;
        
        const alive = await isLinkReachable(downloadData.link, signal);
        if (alive) {
          // Mise en cache si succès
          if (!tubidyPageUrl) {
            try {
              db.prepare("INSERT OR REPLACE INTO tubidy_mapping (deezer_id, tubidy_url, title) VALUES (?, ?, ?)")
                .run(deezerId, match.download_page, match.title);
            } catch (e) {}
          }
          return {
            source: { id: deezerId, title: track.title, artist: track.artist.name, thumbnail: track.album.cover_medium },
            target: { title: match.title, link: downloadData.link, format: format === "video" ? "MP4 video" : "MP3 audio" }
          };
        }
      } catch (e) { return null; }
    });

    const finalResult = await Promise.race(testPromises.map(p => p.then(res => {
      if (res) return res;
      throw new Error("Lien invalide");
    }))).catch(() => null);

    if (finalResult) return finalResult;

    // Si Promise.race échoue, on attend que le premier qui finit positivement réponde (avec un Promise.all filtré)
    const allRes = await Promise.all(testPromises);
    const success = allRes.find(r => r !== null);
    
    if (success) return success;

    throw new Error("Aucun lien Tubidy valide n'a pu être extrait.");
  } catch (error) {
    console.error("[mapping] Error Mapping:", error.message);
    throw error;
  }
}

module.exports = { getTubidyDownloadByDeezerId };
