import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import wasm from "vite-plugin-wasm";
import path from "path";
// import tailwindcss from "@tailwindcss/vite";

// https://web.dev/articles/add-manifest?utm_source=devtools
const manifestOpts = {
  name: "SolidYjs",
  short_name: "SolidYjs",
  display: "standalone",
  scope: "/",
  // start_url: "/",
  description: "A demo LiveView webapp with offline enabled",
  theme_color: "#ffffff",
  icons: [
    {
      src: "/images/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/images/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ],
};

const buildOps = {
  outDir: "../priv/static/",
  emptyOutDir: false,
  target: ["esnext"],
  manifest: false,
  rollupOptions: {
    input: [
      "js/app.js",
      "js/onlineStatus.js",
      "js/solHook.jsx",
      "js/counter.jsx",
      "js/SolidComp.jsx",
      "js/bins.jsx",
      "js/initYJS.js",
      "js/refreshSW.js",
      "wasm/great_circle.wasm",
    ],
    output: {
      assetFileNames: "assets/[name][extname]",
      chunkFileNames: "assets/[name].js",
      entryFileNames: "assets/[name].js",
    },
  },
  // external: ["wasm/great_circle.wasm"],
  commonjsOptions: {
    exclude: [],
    include: ["vendor/topbar.cjs"],
  },
};

const LVWebSocket = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/websocket"),
  handler: "NetworkOnly", // Websockets must always go to network
};

const LVNavigation = {
  urlPattern: ({ request }) =>
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html"),
  handler: "NetworkFirst",
  options: {
    cacheName: "lv-nav",
    networkTimeoutSeconds: 3,
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          console.warn("Navigation request failed:", request.url);
        },
      },
    ],
  },
};

const LVLongPoll = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/longpoll"),
  handler: "NetworkFirst",
  options: {
    cacheName: "longpoll",
    networkTimeoutSeconds: 5,
    plugins: [
      {
        handlerDidError: async ({ request }) => {
          const url = new URL(request.url);
          // Provide a graceful fallback for offline mode
          return new Response(
            JSON.stringify({
              events: [],
              status: "ok",
              token: url.searchParams.get("token"),
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        },
      },
    ],
  },
};

const StaticAssets = {
  urlPattern: ({ url }) => {
    const staticPaths = ["/assets/", "/images/"];
    return staticPaths.some((path) => url.pathname.startsWith(path));
  },
  handler: "CacheFirst",
  options: {
    cacheName: "static",
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      maxEntries: 200,
    },
    matchOptions: {
      ignoreVary: true, // Important for Phoenix static asset handling
    },
  },
};

const ExternalResources = {
  urlPattern: ({ url }) => {
    const externalPatterns = [
      "https://fonts.googleapis.com",
      "https://tile.openstreetmap.org",
    ];
    return externalPatterns.some((pattern) => url.href.startsWith(pattern));
  },
  handler: "CacheFirst",
  options: {
    cacheName: "external",
    expiration: {
      maxAgeSeconds: 60 * 60, // 1 hours
      maxEntries: 500,
    },
    matchOptions: {
      ignoreVary: true, // Important for some external resources
    },
  },
};

const CacheFirstScript = {
  urlPattern: ({ request }) => request.destination === "script",
  handler: "CacheFirst",
};

const Tiles = {
  urlPattern: ({ url }) => url.origin === "https://tile.openstreetmap.org",
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "tiles",
    expiration: {
      maxEntries: 1000, // Adjust based on your needs
      maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
    },
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          console.warn("Tile request failed:", request.url);
        },
      },
    ],
  },
};

// const NetworkFirstMap = {
//   urlPattern: ({ url }) => url.pathname.startsWith("/map"), // Match the "/map" route
//   handler: "NetworkFirst", // Try network first, fallback to cache
//   options: {
//     cacheName: "map-page", // Cache name for LiveView routes
//     expiration: {
//       maxEntries: 50, // Max number of entries in the cache
//       maxAgeSeconds: 7 * 24 * 60 * 60, // Cache for 7 days
//     },
//   },
// };

const devOps = {
  enabled: true,
  type: "module",
};

const PWAOpts = {
  devOptions: devOps,
  registerType: "autoUpdate",
  strategies: "generateSW",
  // stsrategies: "injectManifest",
  includeAssets: ["favicon.ico", "robots.txt"],
  manifest: manifestOpts,
  outDir: "../priv/static/",
  filename: "sw.js",
  manifestFilename: "manifest.webmanifest",
  workbox: {
    navigationPreload: true, // <----???
    globDirectory: path.resolve(__dirname, "../priv/static/"),
    globPatterns: [
      // "*/*.*",
      // "*.*",
      "assets/**/*.{js,jsx,css,ico, wasm}",
      "images/**/*.{png,jpg,svg,webp}",
    ],
    swDest: "../priv/static/sw.js",
    navigateFallback: null, // Do not fallback to index.html !!!!!!!!!
    inlineWorkboxRuntime: true, // Inline the Workbox runtime into the service worker. You can't serve timestamped URLs with Phoenix
    runtimeCaching: [
      LVWebSocket,
      LVLongPoll,
      LVNavigation,
      StaticAssets,
      ExternalResources,
      Tiles,
    ],
  },
};

const CSSSOpts = {
  postcss: {
    plugins: [tailwindcss, autoprefixer],
  },
};

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (command != "build") {
    process.stdin.on("close", () => {
      process.exit(0);
    });

    process.stdin.resume();
  }

  return {
    base: "/",
    plugins: [wasm(), solidPlugin(), VitePWA(PWAOpts)],
    resolve: {
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", "wasm"],
    },
    publicDir: false,
    build: buildOps,
    css: CSSSOpts,
    define: {
      __APP_ENV__: env.APP_ENV,
    },
  };
});
