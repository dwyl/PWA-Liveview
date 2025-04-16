import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import viteCompression from "vite-plugin-compression";
import wasm from "vite-plugin-wasm";
import path from "path";
// import { url } from "inspector";
// import tailwindcss from "@tailwindcss/vite";

// https://web.dev/articles/add-manifest?utm_source=devtools
const manifestOpts = {
  name: "SolidYjs",
  short_name: "SolidYjs",
  display: "standalone",
  scope: "/",
  start_url: "/",
  description: "A demo LiveView webapp with offline enabled",
  theme_color: "#000000",
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
  // sourcemap: true,
  target: ["esnext"],
  manifest: true,
  rollupOptions: {
    input: [
      "js/app.js",
      "js/bins.jsx",
      "js/configureTopbar.js",
      "js/counter.jsx",
      "js/formCities.jsx",
      "js/formVComp.jsx",
      "js/formVHook.js",
      "js/initMap.js",
      "js/initYJS.js",
      "js/mapVHook.js",
      "js/pwaHook.js",
      "js/renderVForm.js",
      "js/renderVMap.js",
      "js/StockComponent.jsx",
      "js/StockHook.js",
      "js/valtioObservers.js",
      "js/vStore.js",
      "wasm/great_circle.wasm",
    ],
    output: {
      assetFileNames: "assets/[name][extname]",
      chunkFileNames: "assets/[name].js",
      entryFileNames: "assets/[name].js",
    },
  },
};

const LongPoll = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/longpoll"),
  options: {
    fetchOptions: {
      credentials: "same-origin", // 🔐 preserves cookies and headers needed by Phoenix
    },
  },
  handler: async ({ event }) => {
    try {
      const response = await fetch(event.request);
      return response;
    } catch (error) {
      // console.warn("[Workbox fallback] Failed to fetch longpoll:", error);
      return new Response(null, {
        status: 204,
        statusText: "Longpoll fallback",
      });
    }
  },
  method: "GET",
};

const LiveReload = {
  urlPattern: ({ url }) => url.pathname.startsWith("/live/reload"),
  handler: "NetworkOnly",
};

const VersionedAssets = {
  urlPattern: ({ url }) => {
    // Match versioned assets (with hash in filename)
    return url.pathname.match(
      /\/assets\/(.*-[a-f0-9]+\.(js|css)|appV-[a-f0-9]+\.(js|css))/
    );
  },
  handler: "CacheFirst",
  options: {
    cacheName: "versioned-assets",
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year (versioned assets rarely change)
    },
    matchOptions: {
      ignoreSearch: true, // Ignore vsn parameter
    },
    fetchOptions: {
      credentials: "same-origin",
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip query parameters
          const url = new URL(request.url);
          url.search = "";
          return url.toString();
        },
        // fetchDidFail: async ({ request }) => {
        //   console.warn("Versioned asset fetch failed:", request.url);
        // },
      },
    ],
  },
};

const StaticAssets = {
  // urlPattern: ({ url }) => {
  //   const staticPaths = ["/assets/", "/images/"];
  //   return staticPaths.some(
  //     (path) =>
  //       url.pathname.startsWith(path) ||
  //       url.pathname.match(/\/assets\/.*\.[a-z]+(\?vsn=\w+)?$/)
  //   );
  // },
  urlPattern: ({ url }) => {
    // Match static assets and script destinations
    return (
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/images/") ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|wasm)$/)
    );
  },
  handler: "CacheFirst",
  options: {
    cacheName: "static-assets",
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      maxEntries: 200,
    },
    matchOptions: {
      // ignoreVary: true, // Important for Phoenix static asset handling
      ignoreSearch: true, // Crucial for handling ?vsn= parameters
    },
    fetchOptions: {
      credentials: "same-origin",
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
    // plugins: [
    //   {
    //     cacheKeyWillBeUsed: async ({ request }) => {
    //       // Strip out vsn query parameter
    //       const url = new URL(request.url);
    //       url.search = ""; // Remove query string
    //       return url.toString();
    //     },
    //   },
    // ],
  },
};

const AppAssets = {
  urlPattern: ({ url }) => {
    // Target primary app bundles (both JS and CSS)
    return url.pathname.match(/\/assets\/appV-[a-f0-9]+\.(js|css)/);
  },
  handler: "StaleWhileRevalidate", // Better strategy for critical app files
  options: {
    cacheName: "app-core-assets",
    fetchOptions: {
      credentials: "same-origin",
    },
    matchOptions: {
      ignoreSearch: true, // Ignore vsn parameters
    },
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url);
          url.search = ""; // Strip query parameters
          return url.toString();
        },
        fetchDidFail: async ({ request }) => {
          console.error("App asset fetch failed:", request.url);
        },
      },
    ],
  },
};

const MapTilerSDK = {
  urlPattern: ({ url }) => {
    return (
      url.hostname === "api.maptiler.com" && url.pathname.startsWith("/maps/")
    );
  },
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "maptiler-sdk",
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      purgeOnQuotaError: true,
    },
    matchOptions: {
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      credentials: "same-origin",
    },
  },
};

const Tiles = {
  urlPattern: ({ url }) => {
    return (
      url.hostname === "api.maptiler.com" && !url.pathname.startsWith("/maps/")
    );
  },
  handler: "CacheFirst",
  options: {
    cacheName: "maptiler-tiles",
    expiration: {
      maxEntries: 500,
      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      purgeOnQuotaError: true,
    },
    matchOptions: {
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      credentials: "same-origin",
    },
    // plugins: [
    //   {
    //     cacheKeyWillBeUsed: async ({ request }) => {
    //       // Strip out dynamic query parameters
    //       const url = new URL(request.url);
    //       const baseUrl = `${url.origin}${url.pathname}`;
    //       return baseUrl;
    //     },
    //     fetchDidFail: async ({ request }) => {
    //       console.warn("Tile request failed:", request.url);
    //     },
    //   },
    // ],
  },
};

const Fonts = {
  urlPattern: ({ url }) => {
    return (
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com" ||
      url.pathname.match(/\.(woff|woff2|ttf|otf)$/)
    );
  },
  handler: "CacheFirst",
  options: {
    cacheName: "fonts",
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 365, // 1 hours
      maxEntries: 20,
    },
    // matchOptions: {
    //   ignoreVary: true, // Important for some external resources
    //   ignoreSearch: true, // Ignore query parameters
    // },
    fetchOptions: {
      mode: "cors",
      // credentials: "same-origin",
    },
  },
};

const Pages = {
  urlPattern: ({ url }) => url.pathname === "/" || url.pathname === "/map",
  // || url.pathname.startsWith("/"),
  handler: "NetworkFirst",
  options: {
    cacheName: "pages",
    expiration: {
      maxEntries: 10, // Only keep 10 page versions
      maxAgeSeconds: 60 * 60 * 2, // 2 hours
    },
    matchOptions: {
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      credentials: "same-origin",
    },
  },
};

const HtmlNavigation = {
  urlPattern: ({ request }) => request.mode === "navigate",
  handler: "NetworkFirst",
  options: {
    networkTimeoutSeconds: 3,
    plugins: [
      {
        handlerDidError: async () => {
          return caches.match("/", { ignoreSearch: true });
        },
      },
    ],
  },
};

const runtimeCaching = [
  LongPoll,
  LiveReload,
  AppAssets,
  VersionedAssets,
  StaticAssets,
  MapTilerSDK, // Add the SDK route before Tiles
  Tiles,
  Fonts,
  Pages,
  HtmlNavigation,
];

const createPWAConfig = (mode) => ({
  devOptions: {
    enabled: mode === "development",
    type: "module",
    suppressWarnings: false,
  },
  // injectRegister: null, // Do not nject the SW registration script as "index.html" does not exist
  registerType: "autoUpdate",
  filename: "sw.js",
  strategies: "generateSW",

  // srcDir: "./js",
  includeAssets: ["favicon.ico", "robots.txt"],
  manifest: manifestOpts,
  outDir: path.resolve(__dirname, "../priv/static/"),
  manifestFilename: "manifest.webmanifest",
  injectManifest: {
    injectionPoint: undefined,
  },
  workbox: {
    navigationPreload: false, // <----???
    // navigateFallback: null, // Do not fallback to index.html !!!!!!!!!
    navigateFallback: "/",
    navigateFallbackDenylist: [
      /^\/live/, // Exclude LiveView websocket paths
      /^\/phoenix/, // Exclude Phoenix-specific paths
      /^\/websocket/,
      /\.(js|css|png|jpg|jpeg|gif|svg)$/,
    ],
    globDirectory: path.resolve(__dirname, "../priv/static/"),
    globPatterns: [
      "assets/**/*.{js,jsx,css,ico, wasm}",
      "images/**/*.{png,jpg,svg,webp}",
    ],
    swDest: path.resolve(__dirname, "../priv/static/sw.js"),
    cleanupOutdatedCaches: true,
    inlineWorkboxRuntime: true, // Inline the Workbox runtime into the service worker. You can't serve timestamped URLs with Phoenix
    ignoreURLParametersMatching: [/^vsn$/],
    additionalManifestEntries: [
      { url: "/", revision: null },
      { url: "/map", revision: null },
    ],
    runtimeCaching,
    clientsClaim: true, // take control of all open pages as soon as the service worker activates
    skipWaiting: true, // New service worker versions activate immediately
    // Without these settings, you might have some pages using old service worker versions
    // while others use new ones, which could lead to inconsistent behavior in your offline capabilities.
    mode: mode === "development" ? "development" : "production", // workbox own mode
  },
});

const CSSSOpts = {
  postcss: {
    plugins: [tailwindcss, autoprefixer],
  },
};

const resolveConfig = {
  alias: {
    "@": path.resolve(__dirname, "./js"),
    "@components": path.resolve(__dirname, "./js/components"),
    "@assets": path.resolve(__dirname, "./assets"),
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
    plugins: [
      wasm(),
      viteCompression(),
      solidPlugin(),
      VitePWA(createPWAConfig(mode)),
    ],
    resolve: {
      ...resolveConfig,
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
        "webp",
        "jpg",
      ],
    },
    publicDir: false,
    build: {
      ...buildOps,
      // sourceMap: true, // Enable source maps in all modes
      minify: mode === "production" ? "terser" : false,
      cssCodeSplit: true,
      reportCompressedSize: mode === "production",
    },
    css: CSSSOpts,
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
  };
});
