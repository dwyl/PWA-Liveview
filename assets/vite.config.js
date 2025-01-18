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
  start_url: "/",
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
      "js/initYJS.js",
      "js/pwaHook.js",
      "js/solHook.js",
      "js/SolidComp.jsx",
      "js/counter.jsx",
      "js/bins.jsx",
      "js/mapHookOrigin.js",
      "js/formHook.js",
      "js/formComp.jsx",
      "js/formCities.jsx",
      "wasm/great_circle.wasm",
    ],
    output: {
      assetFileNames: "assets/[name][extname]",
      chunkFileNames: "assets/[name].js",
      entryFileNames: "assets/[name].js",
    },
  },
  // commonjsOptions: {
  //   exclude: [],
  //   include: ["vendor/topbar.cjs"],
  // },
};

const LVLongPoll = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/longpoll"),
  handler: "NetworkOnly",
};

const LVTestOnline = {
  urlPattern: ({ url }) => url.pathname.startsWith("/test"),
  handler: "NetworkOnly",
};

const LVWebSocket = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/websocket"),
  handler: "NetworkOnly", // Websockets must always go to network
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

const Fonts = {
  urlPattern: ({ url }) => {
    const externalPatterns = ["https://fonts.googleapis.com"];
    return externalPatterns.some((pattern) => url.href.startsWith(pattern));
  },
  handler: "CacheFirst",
  options: {
    cacheName: "external",
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 hours
      maxEntries: 500,
    },
    matchOptions: {
      ignoreVary: true, // Important for some external resources
    },
  },
};

const Scripts = {
  urlPattern: ({ request }) => request.destination === "script",
  handler: "CacheFirst",
  options: {
    cacheName: "scripts",
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      maxEntries: 50,
    },
  },
};

const Tiles = {
  // urlPattern: ({ url }) => url.origin === "https://tile.openstreetmap.org",
  urlPattern: ({ url }) => url.origin === "https://api.maptiler.com/",
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "tiles",
    expiration: {
      maxEntries: 1000, // Adjust based on your needs
      maxAgeSeconds: 60 * 60, // 1 hours
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

const LiveReload = {
  urlPattern: ({ url }) => url.pathname.startsWith("/phoenix"),
  handler: "NetworkOnly",
};

const Pages = {
  urlPattern: ({ url }) =>
    url.pathname.startsWith("/map") || url.pathname.startsWith("/"),
  handler: "NetworkFirst",
  options: {
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          console.warn("Online status request failed:", request.url);
        },
      },
    ],
  },
};

const devOps = {
  enabled: true,
  type: "module",
};

const PWAOpts = {
  devOptions: devOps,
  registerType: "autoUpdate",
  filename: "sw.js",
  strategies: "generateSW",
  // srcDir: "./js",
  includeAssets: ["favicon.ico", "robots.txt"],
  manifest: manifestOpts,
  outDir: "../priv/static/",
  manifestFilename: "manifest.webmanifest",
  injectRegister: "auto", // Automatically inject the SW registration script
  injectManifest: {
    injectionPoint: undefined,
  },
  workbox: {
    //   navigationPreload: true, // <----???
    globDirectory: path.resolve(__dirname, "../priv/static/"),
    globPatterns: [
      "assets/**/*.{js,jsx,css,ico, wasm}",
      "images/**/*.{png,jpg,svg,webp}",
    ],
    swDest: "../priv/static/sw.js",
    navigateFallback: null, // Do not fallback to index.html !!!!!!!!!
    inlineWorkboxRuntime: true, // Inline the Workbox runtime into the service worker. You can't serve timestamped URLs with Phoenix
    additionalManifestEntries: [
      { url: "/", revision: null },
      { url: "/map", revision: null },
    ],
    runtimeCaching: [
      Tiles,
      StaticAssets,
      Scripts,
      Fonts,
      LVLongPoll,
      LVWebSocket,
      LVTestOnline,
      LiveReload,
      Pages,
    ],
    clientsClaim: true, // take control of all open pages as soon as the service worker activates
    skipWaiting: true, // New service worker versions activate immediately
    // Without these settings, you might have some pages using old service worker versions
    // while others use new ones, which could lead to inconsistent behavior in your offline capabilities.
  },
};

const CSSSOpts = {
  postcss: {
    plugins: [tailwindcss, autoprefixer],
  },
};

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
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
      extensions: [
        ".mjs",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        "wasm",
        "svg",
        "png",
      ],
    },
    publicDir: false,
    build: buildOps,
    css: CSSSOpts,
    define: {
      __APP_ENV__: env.APP_ENV,
    },
  };
});
