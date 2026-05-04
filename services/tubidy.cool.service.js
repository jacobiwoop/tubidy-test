const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");

const BASE_URL = "https://tubidy.cool";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "max-age=0",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Referer": BASE_URL + "/",
};

/**
 * Recherche sur Tubidy.cool
 */
async function search(query) {
  try {
    const sid = crypto.randomBytes(16).toString("hex");
    const url = `${BASE_URL}/search.php?q=${encodeURIComponent(query)}&sid=${sid}`;
    
    const response = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const results = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();
      
      if (href && href.includes("/watch/") && title) {
        let finalUrl = href;
        if (href.startsWith("//")) finalUrl = "https:" + href;
        else if (!href.startsWith("http")) finalUrl = BASE_URL + href;
        
        results.push({
          title,
          url: finalUrl
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error("[tubidy.cool] Search Error:", error.message);
    return [];
  }
}

/**
 * Récupère les formats de téléchargement pour une URL de veille
 */
async function getFormats(watchUrl) {
  try {
    const response = await axios.get(watchUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const links = [];
    $("li.list-group-item").each((i, el) => {
      const a = $(el).find("a");
      if (a.length > 0) {
        const sizeTag = a.find("span.mb-text");
        const size = sizeTag.text().trim();
        const label = a.text().replace(size, "").trim();
        const href = a.attr("href");
        
        if (href && !href.startsWith("whatsapp") && !href.includes("playlist")) {
          let finalUrl = href;
          if (href.startsWith("//")) finalUrl = "https:" + href;
          else if (!href.startsWith("http")) finalUrl = BASE_URL + href;
          
          links.push({
            label,
            size,
            url: finalUrl
          });
        }
      }
    });
    
    return links;
  } catch (error) {
    console.error("[tubidy.cool] Formats Error:", error.message);
    return [];
  }
}

/**
 * Récupère le lien final (d2mefast.net)
 */
async function getFinalLink(lnkUrl) {
  try {
    const response = await axios.get(lnkUrl, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(response.data);
    
    const links = [];
    $("li.list-group-item").each((i, el) => {
      const a = $(el).find("a");
      if (a.length > 0) {
        const href = a.attr("href");
        if (href && !href.startsWith("whatsapp") && !href.includes("playlist")) {
          const sizeTag = a.find("span.mb-text");
          const size = sizeTag.text().trim();
          const label = a.text().replace(size, "").trim();
          
          let finalUrl = href;
          if (href.startsWith("//")) finalUrl = "https:" + href;
          else if (!href.startsWith("http")) finalUrl = BASE_URL + href;

          links.push({
            label,
            size,
            url: finalUrl
          });
        }
      }
    });
    
    return links;
  } catch (error) {
    console.error("[tubidy.cool] Final Link Error:", error.message);
    return [];
  }
}

/**
 * Pipeline complet : de la recherche au lien final MP3
 */
async function findBestDirectLink(title, artist) {
  const query = `${artist} ${title}`;
  console.log(`[tubidy.cool] Automating search for: ${query}`);
  
  // 1. Search
  const results = await search(query);
  if (results.length === 0) {
    console.log(`[tubidy.cool] No search results found.`);
    return null;
  }
  
  // 2. Get Formats for the first result
  const targetUrl = results[0].url;
  console.log(`[tubidy.cool] Target URL: ${targetUrl}`);
  const formats = await getFormats(targetUrl);
  
  if (formats.length === 0) {
    console.log(`[tubidy.cool] No formats found for this URL.`);
    return null;
  }

  // On cherche le format MP3 Audio
  const mp3Format = formats.find(f => f.label.includes("MP3 Audio"));
  if (!mp3Format) {
    console.log(`[tubidy.cool] No MP3 format available.`);
    return null;
  }
  
  // 3. Get Final Link
  console.log(`[tubidy.cool] Extracting final link from: ${mp3Format.url}`);
  const finals = await getFinalLink(mp3Format.url);
  
  // On cherche le lien "Play" ou "Download"
  const bestFinal = finals.find(f => f.label.includes("Download") || f.label.includes("Play"));
  
  if (bestFinal) {
    console.log(`[tubidy.cool] Success! Final link: ${bestFinal.url.substring(0, 50)}...`);
    return {
      title: results[0].title,
      link: bestFinal.url,
      size: bestFinal.size
    };
  }
  
  return null;
}

module.exports = {
  search,
  getFormats,
  getFinalLink,
  findBestDirectLink
};
