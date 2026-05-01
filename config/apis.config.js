require("dotenv").config();
module.exports = {
  port: process.env.PORT || 3000,
  tubidy: {
    baseUrl: "https://songs.tubidy.com",
    delay: 1000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Referer": "https://songs.tubidy.com/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "max-age=0",
      "Connection": "keep-alive",
    },
  },
};
