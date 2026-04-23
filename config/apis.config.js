require("dotenv").config();
module.exports = {
  port: process.env.PORT || 3000,
  tubidy: {
    baseUrl: "https://songs.tubidy.com",
    delay: 1000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://songs.tubidy.com/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  },
};
