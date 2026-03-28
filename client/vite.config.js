import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.webmanifest",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Spotiwoop Music",
        short_name: "Spotiwoop",
        description: "Stream music directly from Spotiwoop",
        theme_color: "#121212",
        background_color: "#121212",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Ne jamais intercepter les flux audio de streaming externe
        runtimeCaching: [
          {
            // Match audio files and the proxy route
            urlPattern: ({ url }) => {
              return (
                url.origin.includes("d2mefast.net") ||
                url.pathname.endsWith(".mp3") ||
                url.pathname.includes("/api/proxy-audio")
              );
            },
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
