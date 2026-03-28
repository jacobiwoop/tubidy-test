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

const path = require("path");

const app = express();
app.use(express.json());

// Logger simple
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Proxy audio : suit les redirections et retransmet le flux MP3
function proxyAudio(url, res, redirectCount = 0) {
  if (redirectCount > 5) return res.status(500).send("Too many redirects");

  const client = url.startsWith("https") ? https : http;
  client
    .get(url, (upstream) => {
      const { statusCode, headers } = upstream;

      // Suivre les redirections 301/302
      if (
        (statusCode === 301 || statusCode === 302 || statusCode === 307) &&
        headers.location
      ) {
        upstream.resume(); // vider le body pour libérer la connexion
        return proxyAudio(headers.location, res, redirectCount + 1);
      }

      res.setHeader("Content-Type", headers["content-type"] || "audio/mpeg");
      res.setHeader("Accept-Ranges", "bytes");
      if (headers["content-length"]) {
        res.setHeader("Content-Length", headers["content-length"]);
      }
      upstream.pipe(res);
    })
    .on("error", (err) => {
      console.error("[proxy-audio] Error:", err.message);
      if (!res.headersSent) res.status(500).send("Proxy error");
    });
}

app.get("/api/proxy-audio", (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("Missing url param");
  proxyAudio(targetUrl, res);
});

app.use("/api/search", searchRoute);
app.use("/api/stream", streamRoute);
app.use("/api/download", downloadRoute);
app.use("/api/lyrics", lyricsRoute);
app.use("/api/recommend", recommendRoute);
app.use("/api/deezer", deezerRoute);
app.use("/api/me/library", libraryRoute);
app.use("/api/playlists", playlistRoute);

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

app.listen(port, () => {
  console.log(`music-api running on port ${port}`);
});

module.exports = app;
