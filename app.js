require("dotenv").config();
const express = require("express");
const https = require("https");
const http = require("http");
const { port } = require("./config/apis.config");

const searchRoute = require("./routes/search");
const streamRoute = require("./routes/stream");
const downloadRoute = require("./routes/download");
const lyricsRoute = require("./routes/lyrics");
const recommendRoute = require("./routes/recommend");
const deezerRoute = require("./routes/deezer");
const libraryRoute = require("./routes/library");
const playlistRoute = require("./routes/playlists");
const ytmusicRoute = require("./routes/ytmusic");

const path = require("path");

const app = express(); const cors = require("cors"); app.use(cors());
app.use(express.json());

// Logger simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Cache simple pour les redirections (mémoire vive uniquement)
const redirectCache = new Map();

// Proxy audio : suit les redirections et retransmet le flux MP3
function proxyAudio(url, res, req, redirectCount = 0) {
  if (redirectCount > 10) return res.status(500).send("Too many redirects");

  const isInitialUrl = redirectCount === 0;

  // 1. Vérifier le cache de redirections
  if (isInitialUrl && redirectCache.has(url)) {
    const { target, expires } = redirectCache.get(url);
    if (Date.now() < expires) {
      // console.log(`[proxy-audio] Cache hit: ${url.substring(0, 50)}...`);
      return proxyAudio(target, res, req, 1);
    }
  }

  try {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? https : http;

    const requestHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: url.includes("tubidy.cool") || url.includes("d2mefast") ? "https://tubidy.cool/" : "https://tubidy.com/",
    };

    // 2. Transmettre le Range (essentiel pour le streaming/seek)
    // On l'active pour p.php (Play) mais on reste prudent avec c.php (Download)
    if (req.headers.range && !url.includes("c.php")) {
      requestHeaders["Range"] = req.headers.range;
    }

    if (isInitialUrl) {
      console.log(`[proxy-audio] Resolving: ${url.substring(0, 60)}...`);
    }

    const proxyReq = client.get(
      url,
      {
        headers: requestHeaders,
        timeout: 60000, // 60 secondes max pour répondre (plus robuste)
      },
      (upstream) => {
        const { statusCode, headers } = upstream;

        // Suivre les redirections
        if ([301, 302, 307, 308].includes(statusCode) && headers.location) {
          upstream.resume();
          const resolvedUrl = new URL(headers.location, url).href;

          if (isInitialUrl) {
            redirectCache.set(url, {
              target: resolvedUrl,
              expires: Date.now() + 600000,
            });
          }

          console.log(
            `[proxy-audio] Redirect (${statusCode}) to: ...${resolvedUrl.substring(resolvedUrl.length - 30)}`,
          );
          return proxyAudio(resolvedUrl, res, req, redirectCount + 1);
        }

        // Si erreur amont
        if (statusCode >= 400) {
          console.error(
            `[proxy-audio] Upstream Error ${statusCode} for ${url.substring(0, 40)}...`,
          );
          upstream.resume();
          return res.status(statusCode).send(`Upstream Error: ${statusCode}`);
        }

        // Transmettre le status et les headers
        res.status(statusCode);

        const headersToPass = [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
          "cache-control",
        ];

        headersToPass.forEach((h) => {
          if (headers[h]) res.setHeader(h, headers[h]);
        });

        if (!res.getHeader("Content-Type")) {
          res.setHeader("Content-Type", "audio/mpeg");
        }

        upstream.pipe(res);
      },
    );

    proxyReq.on("timeout", () => {
      console.error("[proxy-audio] Upstream Timeout");
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).send("Upstream Timeout");
    });

    proxyReq.on("error", (err) => {
      console.error(`[proxy-audio] Request Error: ${err.code || err.message}`);
      if (!res.headersSent) res.status(500).send("Proxy error");
    });
  } catch (err) {
    console.error("[proxy-audio] Fatal Error:", err.message);
    if (!res.headersSent) res.status(500).send("Invalid URL");
  }
}

app.get("/api/proxy-audio", (req, res) => {
  let targetUrl = req.query.url;
  console.log(`[api] Received proxy request for: ${targetUrl}`);

  if (!targetUrl) return res.status(400).send("Missing url param");

  // Si l'URL est encore encodée (contient des %25), on la décode une fois de plus
  if (targetUrl.includes("%25")) {
    targetUrl = decodeURIComponent(targetUrl);
  }

  proxyAudio(targetUrl, res, req);
});

app.use("/api/search", searchRoute);
app.use("/api/stream", streamRoute);
app.use("/api/download", downloadRoute);
app.use("/api/lyrics", lyricsRoute);
app.use("/api/recommend", recommendRoute);
app.use("/api/deezer", deezerRoute);
app.use("/api/me/library", libraryRoute);
app.use("/api/playlists", playlistRoute);
app.use("/api/ytmusic", ytmusicRoute);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Service des fichiers statiques du frontend
app.use(express.static(path.join(__dirname, "client/dist")));

// Route de secours pour le SPA (React)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});

// 404 pour les routes API non trouvées (si besoin)
app.use("/api/*", (req, res) =>
  res.status(404).json({ error: "API Route not found" }),
);

// Error handler global
app.use((err, req, res, next) => {
  const status = err.response?.status || 500;
  console.error(
    `[Error] ${req.method} ${req.url} - Status: ${status} - Message: ${err.message}`,
  );
  if (err.response?.data) {
    console.error("[Error Data]", JSON.stringify(err.response.data));
  }
  res.status(status).json({
    error: err.message || "Internal server error",
    details: err.response?.data || null,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`music-api running on port ${port}`);
});

module.exports = app;
