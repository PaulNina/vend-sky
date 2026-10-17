import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import type { PluginContext } from "rollup";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Leer versión desde package.json
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
const appVersion = pkg.version || "1.2.0";
const buildDate = new Date();
const buildTime = buildDate.toLocaleString("es-BO", { timeZone: "America/La_Paz" });
const buildId = `${appVersion}-${Date.now().toString(36)}`;

// Generar public/version.json sincrónicamente para desarrollo y pre-build
try {
  const publicDir = path.resolve(__dirname, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.resolve(publicDir, "version.json"),
    JSON.stringify({ version: appVersion, buildTime, buildId }, null, 2),
    "utf-8"
  );
} catch (e) {
  console.warn("No se pudo escribir public/version.json:", e);
}

// Plugin para emitir version.json en el bundle de producción
function versionJsonPlugin(): Plugin {
  return {
    name: "vite-plugin-version-json",
    generateBundle(this: PluginContext) {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(
          {
            version: appVersion,
            buildTime,
            buildId,
          },
          null,
          2
        ),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    host: "::",
    port: 8080,
    hmr:
      mode === "production"
        ? false
        : {
            overlay: false,
          },
  },
  plugins: [
    react(),
    versionJsonPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["skyworth-app-icon.svg"],
      manifest: {
        name: "SKYWORTH Bono Vendedor",
        short_name: "Bono Vendedor",
        description: "Sistema de bono vendedor SKYWORTH Bolivia",
        theme_color: "#0069C8",
        background_color: "#080B10",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          {
            src: "skyworth-app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "skyworth-app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "skyworth-app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
        screenshots: [],
        categories: ["business", "productivity"],
      },
      workbox: {
        // ACTIVACIÓN INMEDIATA DEL NUEVO CÓDIGO
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Excluimos index.html de globPatterns para que el navegador siempre reciba el HTML más reciente
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // API calls: NetworkOnly para no cachear peticiones al backend
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
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
