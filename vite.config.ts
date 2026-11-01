import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Project Pages uses /aufmassapp/; user/custom-domain root sites can set '/'.
const base = process.env.VITE_BASE_PATH ?? "/aufmassapp/";
if (!/^\/(?:[^?#]*\/)?$/.test(base) || base.includes("..")) {
  throw new Error(
    "VITE_BASE_PATH muss ein absoluter Pfad mit abschließendem / sein.",
  );
}

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/*.png"],
      manifest: {
        id: base,
        name: "Baustellenaufmaß",
        short_name: "Aufmaß",
        description: "Projekte auf der Baustelle lokal und offline verwalten.",
        lang: "de",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f4f5ef",
        theme_color: "#155b46",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
