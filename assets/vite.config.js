import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import viteCompression from "vite-plugin-compression";
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
      "js/appV.js",
      "js/pwaHook.js",
      "js/configureTopbar.js",
      "js/initYJS.js",
      "js/yHook.js",
      "js/SolidYComp.jsx",
      "js/counter.jsx",
      "js/bins.jsx",
      "js/vStore.js",
      "js/renderVForm.js",
      "js/renderVMap.js",
      "js/valtioObservers.js",
      "js/initMap.js",
      "js/mapVHook.js",
      "wasm/great_circle.wasm",
      "js/formVHook.js",
      "js/formVComp.jsx",
      "js/formCities.jsx",
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
    return staticPaths.some(
      (path) =>
        url.pathname.startsWith(path) ||
        url.pathname.match(/\/assets\/.*\.[a-z]+(\?vsn=\w+)?$/)
    );
  },
  handler: "CacheFirst",
  options: {
    cacheName: "static",
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
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip out vsn query parameter
          const url = new URL(request.url);
          url.search = ""; // Remove query string
          return url.toString();
        },
      },
    ],
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
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      mode: "cors",
      credentials: "same-origin",
    },
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip out dynamic query parameters
          const url = new URL(request.url);
          const baseUrl = `${url.origin}${url.pathname}`;
          return baseUrl;
        },
        fetchDidFail: async ({ request }) => {
          console.warn("MapTiler SDK request failed:", request.url);
        },
      },
    ],
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
    matchOptions: {
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      credentials: "same-origin",
    },
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip out vsn query parameter
          const url = new URL(request.url);
          url.search = ""; // Remove query string
          return url.toString();
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
  // handler: "CacheFirst",
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
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip out dynamic query parameters
          const url = new URL(request.url);
          const baseUrl = `${url.origin}${url.pathname}`;
          return baseUrl;
        },
        fetchDidFail: async ({ request }) => {
          console.warn("MapTiler SDK request failed:", request.url);
        },
      },
    ],
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
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Strip out dynamic query parameters
          const url = new URL(request.url);
          const baseUrl = `${url.origin}${url.pathname}`;
          return baseUrl;
        },
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
  urlPattern: ({ url }) => url.pathname === "/" || url.pathname === "/map",
  // || url.pathname.startsWith("/"),
  handler: "NetworkFirst",
  options: {
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          console.warn("Online status request failed:", request.url);
        },
      },
    ],
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

const createPWAConfig = (mode) => ({
  // const PWAOpts = {
  devOptions: {
    enabled: mode === "development",
    type: "module",
    suppressWarnings: false,
  },
  registerType: "autoUpdate",
  filename: "sw.js",
  strategies: "generateSW",
  // srcDir: "./js",
  includeAssets: ["favicon.ico", "robots.txt"],
  manifest: manifestOpts,
  outDir: path.resolve(__dirname, "../priv/static/"),
  manifestFilename: "manifest.webmanifest",
  injectRegister: "auto", // Automatically inject the SW registration script
  injectManifest: {
    injectionPoint: undefined,
  },
  workbox: {
    navigationPreload: true, // <----???
    // navigateFallback: null, // Do not fallback to index.html !!!!!!!!!
    navigateFallback: "/",
    navigateFallbackDenylist: [
      /^\/live/, // Exclude LiveView websocket paths
      /^\/phoenix/, // Exclude Phoenix-specific paths
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
    // manifestTransforms: [
    //   (entries) => {
    //     // Remove query parameters from entries
    //     const transformedEntries = entries.map((entry) => ({
    //       url: entry.url.split("?")[0],
    //       revision: null,
    //     }));
    //     return { manifest: transformedEntries };
    //   },
    // ],
    runtimeCaching: [
      // {
      //   urlPattern: ({ request, url }) => {
      //     console.log("Caching attempt:", {
      //       url: url.pathname,
      //       destination: request.destination,
      //     });
      //     return url.pathname === "/" || url.pathname === "/map";
      //   },
      //   handler: "NetworkFirst", // Try network first
      //   options: {
      //     cacheName: "liveview-pages",
      //     networkTimeoutSeconds: 10,
      //     expiration: {
      //       maxEntries: 10,
      //       maxAgeSeconds: 24 * 60 * 60, // 24 hours
      //     },
      //     fetchOptions: {
      //       mode: "cors",
      //       credentials: "same-origin",
      //     },
      //   },
      // },
      MapTilerSDK, // Add the SDK route before Tiles
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
