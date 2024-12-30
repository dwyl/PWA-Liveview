import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import wasm from "vite-plugin-wasm";
// import tailwindcss from "@tailwindcss/vite";

// https://web.dev/articles/add-manifest?utm_source=devtools
const manifestOpts = {
  name: "SolidYjs",
  short_name: "SolidYjs",
  display: "standalone",
  scope: "/",
  description: "A LiveView + SolidJS PWA and Yjs demo",
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

const rtcNetworkFirstTiles = {
  urlPattern: ({ url }) => url.origin === "https://tile.openstreetmap.org",
  handler: "NetworkFirst",
  options: {
    cacheName: "tile-cache",
    networkTimeoutSeconds: 3,
    fetchOptions: {
      mode: "cors", // Ensure CORS mode for cross-origin requests
    },
    plugins: [
      {
        cacheDidUpdate: async ({ request, response }) => {
          // Log if the response is opaque
          if (response && response.type === "opaque") {
            console.warn("Opaque response detected:", request.url);
          }
        },
      },
      {
        fetchDidFail: async ({ request }) => {
          console.warn("Tile request failed:", request.url);
        },
      },
    ],
  },
};

const rtcNetworkFirstNavigation = {
  urlPattern: ({ request }) => request.mode === "navigate", // Handle navigation requests
  handler: "NetworkFirst",
  options: {
    cacheName: "navigation-cache",
    networkTimeoutSeconds: 3,
    plugins: [
      {
        // Customize what happens on fetch failure
        fetchDidFail: async ({ request }) => {
          console.warn("Navigation request failed:", request.url);
        },
      },
    ],
  },
};

const rtcNetworkFirtLongPoll = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/longpoll"),
  handler: "NetworkFirst",
  options: {
    cacheName: "long-poll-cache",
    networkTimeoutSeconds: 5,
    plugins: [
      {
        // Handle offline fallback for longpoll
        handlerDidError: async ({ request }) => {
          const url = new URL(request.url);
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

const rtcCacheFirstAssets = {
  urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
  handler: "CacheFirst",
  options: {
    cacheName: "assets-cache",
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
    },
  },
};

const rtcCacheFirstImages = {
  urlPattern: ({ url }) => url.pathname.startsWith("/images/"),
  handler: "CacheFirst",
  options: {
    cacheName: "images",
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
    },
  },
};

const rtcCacheFirstFonts = {
  urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
  handler: "CacheFirst",
  options: {
    cacheName: "google-fonts-cache",
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
    },
  },
};

const rtcCacheFirstImages2 = {
  urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
  handler: "CacheFirst",
  options: {
    cacheName: "images",
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
    },
  },
};

const rtcNetworkFirstMap = {
  urlPattern: ({ url }) => url.pathname.startsWith("/map"), // Match the "/map" route
  handler: "NetworkFirst", // Try network first, fallback to cache
  options: {
    cacheName: "map-page", // Cache name for LiveView routes
    expiration: {
      maxEntries: 50, // Max number of entries in the cache
      maxAgeSeconds: 7 * 24 * 60 * 60, // Cache for 7 days
    },
  },
};

const devOps = {
  enabled: true,
  type: "module",
};

const PWAOpts = {
  devOptions: devOps,
  // strategies: "generateSW",
  strategies: "injectManifest",
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "robots.txt", "manifest.webmanifest"],
  manifest: manifestOpts,
  outDir: "../priv/static/",
  filename: "sw.js",
  manifestFilename: "manifest.webmanifest",
  workbox: {
    // navigateFallback: "/index.html",
    navigationPreload: true,
    globDirectory: "../priv/static/",
    globPatterns: [
      "assets/**/*.{js,jsx,css,ico,png,svg,webp,woff,woff2, wasm}",
      "images/**/*.{png,jpg,svg,webp}",
    ],
    swDest: "../priv/static/sw.js",
    inlineWorkboxRuntime: true,
    runtimeCaching: [
      rtcNetworkFirtLongPoll,
      // rtcCacheFirstAssets,
      rtcCacheFirstFonts,
      // rtcCacheFirstImages,
      rtcCacheFirstImages2,
      // rtcNetworkFirstMap,
      rtcNetworkFirstNavigation,
      rtcNetworkFirstTiles,
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
    plugins: [wasm(), solidPlugin(), VitePWA(PWAOpts)],
    resolve: {
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },
    // optimizeDeps: {
    //   include: ["@solidjs/router"],
    // },
    publicDir: false,
    build: buildOps,
    css: CSSSOpts,
    define: {
      __APP_ENV__: env.APP_ENV,
    },
  };
});
