require("dotenv").config();
const express = require("express");
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

// Routes API
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
