import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr:
      mode === "production"
        ? false
        : {
            clientPort: 8080,
            port: 8080,
            protocol: "ws",
            overlay: false,
          },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-512.png"],
      manifest: {
        name: "SKYWORTH Bono Vendedor",
        short_name: "Bono Vendedor",
        description: "Sistema de bono vendedor SKYWORTH Bolivia",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          {
            src: "pwa-512.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [],
        categories: ["business", "productivity"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // API calls: NetworkFirst — always try network, fallback to cache
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
              },
              networkTimeoutSeconds: 180,
            },
          },
          {
            // Static assets: CacheFirst
            urlPattern: ({ request }) =>
              request.destination === "image" || request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "assets-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // no activar SW en desarrollo
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
