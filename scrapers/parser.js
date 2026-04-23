const cheerio = require("cheerio");

function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const results = [];
  $("article.item").each((_, el) => {
    const titleTag = $(el).find("a.title");
    const title = titleTag.attr("title") || titleTag.text().trim() || null;
    let downloadPage = titleTag.attr("href") || null;
    if (downloadPage && !downloadPage.startsWith("http"))
      downloadPage = "https://songs.tubidy.com" + downloadPage;
    const img = $(el).find("img.thumb");
    const thumbnail = img.attr("data-src") || img.attr("src") || null;
    const timeTag = $(el).find("time.duration");
    const durationIso = timeTag.attr("datetime") || null;
    const durationText = timeTag.find("span").text().trim() || null;
    if (title && downloadPage)
      results.push({
        title,
        download_page: downloadPage,
        thumbnail,
        duration: durationText,
        duration_iso: durationIso,
      });
  });
  return results;
}

function hasNextPage(html, currentPage) {
  const $ = cheerio.load(html);
  let found = false;
  $("a[href]").each((_, el) => {
    if (($(el).attr("href") || "").includes(`page=${currentPage + 1}`)) {
      found = true;
      return false;
    }
  });
  if (!found) found = $("article.item").length > 0;
  return found;
}

module.exports = { parseSearchPage, hasNextPage };
