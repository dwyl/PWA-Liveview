import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import wasm from "vite-plugin-wasm";
import path from "path";
import fg from "fast-glob"; // for recursive file scanning
import viteCompression from "vite-plugin-compression";
import tailwindcss from "tailwindcss"; // <--- do not use @tailwindcss/vite

const APPVERSION = process.env.APP_VERSION; // Update this when you change the app version

const rootDir = path.resolve(__dirname);
const cssDir = path.resolve(rootDir, "css");
const jsDir = path.resolve(rootDir, "js");
const wasmDir = path.resolve(rootDir, "wasm");
const srcImgDir = path.resolve(rootDir, "images");
const staticDir = path.resolve(rootDir, "../priv/static/");
const tailwindConfigPath = path.resolve(rootDir, "tailwind.config.js");

const Icon64 = "assets/pwa-64x64.png";
const Icon192 = "assets/pwa-192x192.png";
const Icon512 = "assets/pwa-512x512.png";

const IconMaskable192 = "assets/pwa-maskable-192.png";
const IconMaskable512 = "assets/pwa-maskable-512.png";

// https://web.dev/articles/add-manifest
const manifestOpts = {
  name: "SolidYjs",
  short_name: "SolidYjs",
  display: "standalone",
  scope: "/",
  start_url: "/",
  id: "/",
  description: "A demo collaborative LiveView webapp offline ready",
  theme_color: "#000000",
  background_color: "#FFFFFF",
  icons: [
    {
      src: Icon64,
      sizes: "64x64",
      type: "image/png",
      purpose: "any",
    },
    {
      src: Icon192,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: Icon512,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: IconMaskable192,
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: IconMaskable512,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

// fg will scan JS directory recursively - update to match your actual file structure
const getEntryPoints = () => {
  const entries = [];
  fg.sync([`${jsDir}/**/*.{js,jsx}`]).forEach((file) => {
    if (/\.(js|jsx)$/.test(file)) {
      entries.push(path.resolve(rootDir, file));
    }
  });
  // Add WASM & CSS explicitly
  entries.push(path.resolve(cssDir, "app.css"));
  entries.push(path.resolve(wasmDir, "great_circle.wasm"));

  fg.sync([`${srcImgDir}/**/*.*`]).forEach((file) => {
    if (/\.(jpg|png|svg|webp)$/.test(file)) {
      entries.push(path.resolve(rootDir, file));
    }
  });

  return entries;
};

// source: <https://vite.dev/config/build-options>
const buildOps = (mode) => ({
  target: ["esnext"],
  // Specify the directory to nest generated assets under (relative to build.outDir
  outDir: staticDir,
  cssCodeSplit: true, // Split CSS for better caching
  cssMinify: "lightningcss", // Use lightningcss for CSS minification
  rollupOptions: {
    input: getEntryPoints(),
    output: {
      assetFileNames: "assets/[name][extname]",
      chunkFileNames: "assets/[name].js",
      entryFileNames: "assets/[name].js",
    },
  },
  // generate a manifest file that contains a mapping of non-hashed asset filenames
  // to their hashed versions, which can then be used by a server framework
  // to render the correct asset links.
  manifest: true, // When true, the path would be .vite/manifest.json.
  minify: mode === "production",
  emptyOutDir: false,
  reportCompressedSize: mode === "production",
});

// =============================================
// Service Worker Caching Strategies
// =============================================

const Navigation = {
  urlPattern: ({ request }) => request.mode === "navigate",
  handler: "NetworkFirst",
  options: {
    fetchOptions: {
      credentials: "same-origin",
    },
    cacheName: "pages-cache",
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60, // 1 day
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
  },
};

const LiveView = [
  {
    urlPattern: ({ url }) => {
      return url.pathname.startsWith("/live/longpoll");
    },
    handler: "NetworkOnly",
    options: {
      fetchOptions: {
        credentials: "same-origin",
      },
    },
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/phoenix/live_reload/"),
    handler: "NetworkOnly",
    options: {
      fetchOptions: {
        credentials: "same-origin",
      },
    },
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/ydoc/"),
    handler: "NetworkOnly",
    options: {
      fetchOptions: {
        credentials: "same-origin",
      },
    },
  },
];

const MapTiler = {
  urlPattern: ({ url }) =>
    (url.hostname === "api.maptiler.com" &&
      (url.pathname.startsWith("/maps/") || // Style configs
        url.pathname.startsWith("/resources/"))) || // SDK assets
    url.pathname.startsWith("/tiles/") || // Raster/vector tiles
    url.pathname.startsWith("/data/"), // Tile JSON
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "maptiler",
    cacheableResponse: {
      statuses: [0, 200],
    },
    expiration: { maxEntries: 10, maxAgeSeconds: 604800 }, // 7 days
  },
};

const OtherStaticAsset = {
  urlPattern: ({ url }) =>
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2)$/i.test(url.pathname),
  handler: "CacheFirst",
  options: {
    cacheName: "static",
    expiration: {
      maxEntries: 200,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
    },
    matchOptions: {
      ignoreSearch: true, // Ignore query parameters
      ignoreVary: true,
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
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
    matchOptions: {
      ignoreVary: true, // Important for some external resources
      ignoreSearch: true, // Ignore query parameters
    },
    fetchOptions: {
      mode: "cors",
    },
  },
};

/**
 * List of all caching strategies passed to Workbox
 * The order of the strategies matters! More specific ones should be listed first
 * to avoid conflicts with more general ones.
 */

const runtimeCaching = [
  Navigation,
  ...LiveView,
  MapTiler, // Add the SDK route before Tiles
  OtherStaticAsset,
  Fonts,
  // Catch-all for other resources - stale while revalidate
  // {
  //   urlPattern: /.*/,
  //   handler: "StaleWhileRevalidate",
  //   options: {
  //     cacheName: "others",
  //     expiration: {
  //       maxEntries: 50,
  //       maxAgeSeconds: 24 * 60 * 60, // 1 day
  //     },
  //     cacheableResponse: {
  //       statuses: [0, 200],
  //     },
  //   },
  // },
];

// =============================================
// PWA Configuration Generator
// =============================================
// <https://vite-pwa-org.netlify.app/guide/>

const PWAConfig = (mode) => ({
  devOptions: {
    enabled: mode === "development",
    type: "module",
  },
  suppressWarnings: true,
  injectRegister: null, // Do not nject the SW registration script as "index.html" does not exist
  // registerType: "autoUpdate", // Auto-update service worker
  filename: "sw.js", // Service worker filename
  strategies: "generateSW", // Generate service worker
  // registerType: "autoUpdate", // Let browser handle updates
  includeAssets: ["favicon.ico", "robots.txt"],
  manifest: manifestOpts,
  outDir: staticDir,
  manifestFilename: "manifest.webmanifest",
  // injectManifest: false,
  injectManifest: false, // Do not inject the SW registration script as "index.html" does not exist
  // injectRegister: "auto", // Automatically inject the SW registration script

  // Cache exceptions
  ignoreURLParametersMatching: [
    /^vsn$/,
    /^_csrf$/,
    /^t$/, // Timestamp params
  ],

  workbox: {
    navigationPreload: false, // Ensure WebSocket connections aren't cached

    navigateFallback: null, // ⚠️ Critical for LiveView
    navigateFallbackDenylist: [/^\/websocket/, /^\/live/],
    swDest: path.resolve(staticDir, "sw.js"),

    // ⚠️  Inline the Workbox runtime into the service worker.
    // You can't serve timestamped URLs with Phoenix
    inlineWorkboxRuntime: true,

    // -> Cache control
    globPatterns: ["assets/**/*.*"],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB

    // -> Cache exceptions: tells Workbox which URL parameters to ignore
    // when determining if a request matches a cached resource.
    ignoreURLParametersMatching: [
      /^vsn$/, // Phoenix asset versioning
      /^_csrf$/, // CSRF tokens ],
    ],

    additionalManifestEntries: [
      { url: "/", revision: `${APPVERSION} || ${Date.now()}` },
      { url: "/map", revision: `${APPVERSION} || ${Date.now()}` },
    ],
    runtimeCaching: mode === "development" ? [] : runtimeCaching, // Apply our caching strategies defined above

    // Update behaviour
    clientsClaim: true, // take control of all open pages as soon as the service worker activates
    skipWaiting: false, // let UI control when updates apply, not immediately
    // Without these settings, you might have some pages using old service worker versions
    // while others use new ones, which could lead to inconsistent behavior in your offline capabilities.
    // Ensure HTML responses are cached correctly
    cleanupOutdatedCaches: true,

    dontCacheBustURLsMatching: /^\/assets\/.*\.\w{20}\./, // Phoenix hashed assets

    mode: mode === "development" ? "development" : "production", // workbox own mode
  },
});

/*
Aliases (alias property):
Creates shortcuts for directory paths, 
so instead of writing relative paths 
like ../../components/Button, 
you can use @js/components/Button
*/
const resolveConfig = {
  alias: {
    // "@": rootDir,
    "@js": jsDir,
    "@jsx": jsDir,
    "@css": cssDir,
    "@static": staticDir,
  },
  extensions: [".js", ".jsx", "png", ".css", "webp", "jpg", "svg"],
};

// =============================================
// Main Configuration Export
// =============================================

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
      solidPlugin(),
      VitePWA(PWAConfig(mode)),
      mode == "production"
        ? viteCompression({ algorithm: "brotliCompress" })
        : null,
    ],
    resolve: resolveConfig,
    publicDir: false, // Disable default public dir (using Phoenix's)
    build: buildOps(mode),
    css: {
      postcss: {
        plugins: [tailwindcss(tailwindConfigPath)],
      },
    },
    define: {
      __APP_ENV__: env.APP_ENV, // Inject env vars
    },
  };
});
