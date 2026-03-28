const { fetchPage, sleep } = require('./paginator');
const { parseSearchPage, hasNextPage } = require('./parser');
const config = require('../config/apis.config');

/**
 * Scrape une seule page de résultats Tubidy.
 * @param {string} query
 * @param {number} page
 * @returns {{ results: Array, hasNext: boolean }}
 */
async function scrapePage(query, page = 1) {
  const html = await fetchPage(query, page);
  const results = parseSearchPage(html);
  const next    = hasNextPage(html, page);
  return { results, hasNext: next };
}

/**
 * Scrape toutes les pages pour une requête donnée.
 * @param {string} query
 * @param {object} options
 * @param {number} options.maxPages  - limite de pages (défaut: Infinity)
 * @param {number} options.delay     - délai ms entre pages (défaut: config)
 * @returns {Promise<Array>}
 */
async function scrapeAll(query, { maxPages = Infinity, delay = config.tubidy.delay } = {}) {
  const allResults = [];
  let page = 1;

  while (page <= maxPages) {
    console.log(`[tubidy] page ${page} — "${query}"`);

    let data;
    try {
      data = await scrapePage(query, page);
    } catch (err) {
      console.error(`[tubidy] erreur page ${page}:`, err.message);
      break;
    }

    if (!data.results.length) {
      console.log(`[tubidy] aucun résultat page ${page}, arrêt.`);
      break;
    }

    allResults.push(...data.results);

    if (!data.hasNext) {
      console.log(`[tubidy] dernière page atteinte (${page}).`);
      break;
    }

    page++;
    await sleep(delay);
  }

  return allResults;
}

module.exports = { scrapePage, scrapeAll };
