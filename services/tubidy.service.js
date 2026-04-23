const { scrapeAll, scrapePage } = require("../scrapers/tubidy.scraper");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Helper pour retenter une requête en cas d'erreur réseau (EAI_AGAIN, ETIMEDOUT).
 */
async function withRetry(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError =
        err.code === "EAI_AGAIN" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNRESET" ||
        err.code === "ENOTFOUND" ||
        !err.response;

      if (isNetworkError && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(
          `[tubidy] Network error (${err.code}). Retrying in ${delay}ms... (${i + 1}/${retries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Recherche sur Tubidy — utilisé comme fallback quand SoundCloud ne trouve pas.
 * @param {string} query    - ex: "BTS Swim"
 * @param {object} options
 * @param {number} options.page      - page unique (mode paginé)
 * @param {boolean} options.allPages - scraper toutes les pages
 * @param {number} options.maxPages  - limite si allPages=true
 * @returns {Promise<{ total: number, results: Array }>}
 */
async function search(
  query,
  { page = 1, allPages = false, maxPages = 10 } = {},
  signal = null,
) {
  return withRetry(async () => {
    let results;

    if (allPages) {
      results = await scrapeAll(query, { maxPages });
    } else {
      const data = await scrapePage(query, page);
      results = data.results;
    }

    return {
      source: "tubidy",
      query,
      total: results.length,
      results,
    };
  });
}

/**
 * Trouve le premier résultat correspondant à un titre + artiste.
 * Utilisé par le mapping service pour le fallback.
 * @param {string} title
 * @param {string} artist
 * @returns {Promise<object|null>}
 */
async function findBestMatch(title, artist) {
  const query = `${artist} ${title}`;
  const { results } = await search(query, { page: 1 });

  if (!results.length) return null;

  // Retourne le premier résultat (le plus pertinent selon Tubidy)
  return results[0];
}

/**
 * Obtient le lien de téléchargement direct depuis Tubidy
 * @param {string} videoUrl - L'URL complète de la vidéo (comme dans python)
 * @param {string} formatType - "mp3" ou "video" (par défaut mp3)
 */
async function getDownloadLink(videoUrl, formatType = "mp3", signal = null) {
  return withRetry(async () => {
    // Adaptation du type
    const targetFormat = formatType.toLowerCase().includes("video")
      ? "MP4 video"
      : "MP3 audio";

    // 1. Récupérer la page HTML
    const response = await axios.get(videoUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 2. Extraire CSRF
    const csrf = $('meta[name="csrf-token"]').attr("content");
    if (!csrf) throw new Error("CSRF token introuvable sur Tubidy");

    // 3. Extraire Token
    const tokenMatch = html.match(/App\.video\('([^']+)'\)/);
    if (!tokenMatch)
      throw new Error("Payload App.video() introuvable dans le DOM");
    const token = tokenMatch[1];

    // 4. POST pour obtenir les formats
    const formatsRes = await axios.post(
      "https://songs.tubidy.com/api/video/formats",
      new URLSearchParams({ payload: token }).toString(),
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "X-CSRF-TOKEN": csrf,
          Referer: "https://songs.tubidy.com/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal,
      },
    );

    const formats = formatsRes.data.formats || [];
    let chosenFormat = formats.find(
      (f) => f.label && f.label.includes(targetFormat),
    );

    if (!chosenFormat && formats.length > 0) {
      chosenFormat = formats[0]; // fallback
    }

    if (!chosenFormat) {
      throw new Error("Aucun format disponible pour cette vidéo");
    }

    const newPayload = chosenFormat.payload;

    // 5. POST pour obtenir le lien final
    const downloadRes = await axios.post(
      "https://songs.tubidy.com/api/video/download",
      new URLSearchParams({ payload: newPayload }).toString(),
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "X-CSRF-TOKEN": csrf,
          Referer: "https://songs.tubidy.com/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal,
      },
    );

    return downloadRes.data; // ex: { link: '...', ads: '...' }
  });
}

module.exports = { search, findBestMatch, getDownloadLink };
