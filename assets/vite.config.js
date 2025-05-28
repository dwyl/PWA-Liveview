import { defineConfig } from "vite";

import fs from "fs"; // for file system operations
import path from "path";
import fg from "fast-glob"; // for recursive file scanning

// <-- !! do not use @tailwindcss/vite v4
// but v3.4 instead as Tailwind v4 throws away the tailwind.config.js file
// and Phoenix CSS won't be parsed by Vite without it
import tailwindcss from "tailwindcss";

// import { analyzer } from "vite-bundle-analyzer";

// autoprefixing CSS, eg --webkit for flex/grid, --moz for transitions, etc
// but "ligntningcss" is used for minification and autoprefixing
// import autoprefixer from "autoprefixer";

import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";
import wasm from "vite-plugin-wasm";
import { compression } from "vite-plugin-compression2";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { compress } from "@mongodb-js/zstd";

const rootDir = path.resolve(__dirname);
const cssDir = path.resolve(rootDir, "css");
const jsDir = path.resolve(rootDir, "js");
const seoDir = path.resolve(rootDir, "seo");
const iconsDir = path.resolve(rootDir, "icons");
const wasmDir = path.resolve(rootDir, "wasm");
const srcImgDir = path.resolve(rootDir, "images");
const staticDir = path.resolve(rootDir, "../priv/static");

// / Create the "priv/static/icons" directory if it doesn't exist
// it will hold all the icons
const destIconsDir = path.resolve(staticDir, "icons");
if (!fs.existsSync(destIconsDir)) {
  fs.mkdirSync(destIconsDir, { recursive: true });
}
const assetsDir = path.resolve(staticDir, "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// =============================================
// Manifest options
// https://developer.mozilla.org/en-US/docs/Web/Manifest
// https://web.dev/articles/add-manifest
const Icon16 = "icons/favicon-16.png";
const Icon32 = "icons/favicon-32.png";
const Icon64 = "icons/favicon-64.png";
const Icon192 = "icons/favicon-192.png";
const Icon512 = "icons/favicon-512.png";
const IconMaskable192 = "icons/pwa-maskable-192.png";
const IconMaskable512 = "icons/pwa-maskable-512.png";

const manifestOpts = {
  name: "LiveView PWA web app",
  short_name: "LiveView PWA",
  display: "standalone",
  scope: "/",
  start_url: "/",
  id: "/",
  description: "A demo collaborative LiveView webapp offline ready",
  theme_color: "#000000",
  background_color: "#FFFFFF",
  dir: "auto",
  lang: "en",
  categories: ["productivity", "utilities"],
  orientation: "any",
  prefer_related_applications: false, //<- ⚠️ Android
  launch_handler: {
    client_mode: "auto",
    route_hint: "/",
  },
  screenshots: [
    {
      src: "icons/Screenshot-map.png",
      type: "image/png",
      sizes: "1204x1610",
      form_factor: "wide",
    },
    {
      src: "icons/Screenshot-stock.png",
      type: "image/png",
      sizes: "1190x1150",
    },
  ],
  display_override: ["window-controls-overlay", "standalone", "browser"],
  edge_side_panel: {
    default_area: "left",
    preferred_width: 400,
    default_show: true,
  },
  icons: [
    {
      src: Icon16,
      sizes: "16x16",
      type: "image/png",
      purpose: "any",
    },
    {
      src: Icon32,
      sizes: "32x32",
      type: "image/png",
      purpose: "any",
    },
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

// =============================================
// Rollup entry points file helper
// fg will scan JS directory recursively - update to match your actual file structure
const getEntryPoints = () => {
  const entries = [];
  fg.sync([`${jsDir}/**/*.{js,jsx,ts,tsx}`]).forEach((file) => {
    if (/\.(js|jsx|ts|tsx)$/.test(file)) {
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

// =============================================
// Build options and Rollup options
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
      assetFileNames: "assets/[name]-[hash][extname]",
      chunkFileNames: "assets/[name]-[hash].js",
      entryFileNames: "assets/[name]-[hash].js",
    },
  },
  // generate a manifest file that contains a mapping of non-hashed asset filenames
  // to their hashed versions, which can then be used by a server framework
  // to render the correct asset links.
  manifest: true, // path  --> .vite/manifest.json.
  minify: mode === "production",
  emptyOutDir: true, // Remove old assets
  // sourcemap: mode === "development" ? "inline" : true,
  reportCompressedSize: true,
  assetsInlineLimit: 0,
});

// =============================================
// Service Worker Rentime Caching Strategies

// fetch for Android
const NavAll = {
  urlPattern: ({ request }) => request.destination === "document",
  handler: "NetworkFirst",
  options: {
    cacheName: "pages",
    networkTimeoutSeconds: 3,
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24, // 1 day
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
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
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
    url.pathname.startsWith("/data/") || // Tile JSON
    url.pathname.startsWith("/metrics"),
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "maptiler",
    cacheableResponse: {
      statuses: [0, 200],
    },
    expiration: { maxEntries: 10, maxAgeSeconds: 604800 }, // 7 days
  },
};

const OtherStaticAssets = {
  urlPattern: ({ url }) =>
    /\.(css|png|jpg|jpeg|gif|svg|ico|webp|woff2)$/i.test(url.pathname),
  handler: "CacheFirst",
  options: {
    cacheName: "images",
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

const runtimeCaching = [
  OtherStaticAssets,
  ...LiveView,
  MapTiler, // Add the SDK route before Tiles
  Fonts,
  NavAll,
];

// =============================================
// PWA Configuration Generator
// <https://vite-pwa-org.netlify.app/guide/>

const PWAConfig = (mode) => ({
  // https://vite-pwa-org.netlify.app/guide/inject-manifest.html#development
  devOptions: {
    enabled: mode === "development",
    type: "module", //  ES module for dev SW
  },
  suppressWarnings: true,
  injectRegister: "null", // It is injected in the main.js script
  filename: "sw.js", // Service worker filename
  strategies: "generateSW", // Let Workbox auto-generate the service worker from config
  registerType: "prompt", // App manually prompts user to update SW when available

  outDir: staticDir,
  manifest: manifestOpts,
  manifestFilename: "manifest.webmanifest",
  // injectManifest: {
  //   injectionPoint: undefined,
  // }, // Do not inject the SW registration script as "index.html" does not exist

  // Cache exceptions
  ignoreURLParametersMatching: [
    /^vsn$/, // Phoenix versioning param
    /^_csrf$/, // CSRF protection param
  ],

  workbox: {
    navigationPreload: false, // Ensure WebSocket connections aren't cached
    // no fallback to "index.html" as it does not exist
    navigateFallback: null, // ⚠️ Critical for LiveView
    navigateFallbackDenylist: [/^\/websocket/, /^\/live/],
    swDest: path.resolve(staticDir, "sw.js"),

    // ⚠️  Inline the Workbox runtime into the service worker.
    // You can't serve timestamped URLs with Phoenix
    inlineWorkboxRuntime: true,

    // -> Cache control
    // preload all assets are SW is active after JS is loaded
    globPatterns: ["assets/**/*.*"], // Cache only compiled Vite assets
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB

    // -> Cache exceptions: tells Workbox which URL parameters to ignore
    // when determining if a request matches a cached resource.
    ignoreURLParametersMatching: [
      /^vsn$/, // Phoenix asset versioning
      /^_csrf$/, // CSRF tokens ],
    ],

    additionalManifestEntries: [
      { url: "/", revision: `${Date.now()}` }, // Manually precache root route
      { url: "/yjs", revision: `${Date.now()}` }, // Manually precache elec route
      { url: "/map", revision: `${Date.now()}` }, // Manually precache map route
    ],
    runtimeCaching,
    // Update behaviour
    clientsClaim: true, // Claim control over all uncontrolled pages as soon as the SW is activated
    skipWaiting: false, // let UI control when updates apply, not immediately
    // Without these settings, you might have some pages using old service worker versions
    // while others use new ones, which could lead to inconsistent behavior in your offline capabilities.
    // Ensure HTML responses are cached correctly
    cleanupOutdatedCaches: true,
    mode: mode === "development" ? "development" : "production", // workbox own mode
  },
});

// Alias helpers =============================================
/*
creates shortcuts for directory paths, so instead of 
writing relative paths  like ../../components/Button, 
you can use @js/components/Button
*/
const resolveConfig = {
  alias: {
    // "@": rootDir,
    "@js": jsDir,
    "@jsx": jsDir,
    "@css": cssDir,
    "@static": staticDir,
    "@assets": srcImgDir,
  },
  extensions: [".js", ".jsx", "png", ".css", "webp", "jpg", "svg"],
};

// Static Copy =============================================
/* 
Static Copy of icons and SEO files sitemap.xml, robots.txt
to priv/static/icons and priv/static
to not fingerprint them
*/
const targets = [
  {
    src: path.resolve(seoDir, "**", "*"),
    dest: path.resolve(staticDir),
  },
  {
    src: path.resolve(iconsDir, "**", "*"),
    dest: path.resolve(destIconsDir),
  },
];

// Compression =============================================
// ZSTD Compression of assets
const compressOpts = {
  // https://github.com/nonzzz/vite-plugin-compression/discussions/61#discussioncomment-10243200
  algorithm(buf, level) {
    return compress(buf, level);
  },
  level: 9,
  exclude: /\.(wasm)$/,
  threshold: 5240,
  filename: `[path][base].zstd`,
  deleteOriginalAssets: false,
  verbose: true,
};

// Main config =============================================

export default defineConfig(({ command, mode }) => {
  if (command != "build") {
    process.stdin.on("close", () => {
      process.exit(0);
    });

    process.stdin.resume();
  }

  return {
    base: "/", // "https://cdn.example.com/assets/", // CDN base URL
    plugins: [
      wasm(),
      VitePWA(PWAConfig(mode)),
      solidPlugin(),
      viteStaticCopy({ targets }),
      mode == "production" ? compression(compressOpts) : null,
      // mode == "development" ? analyzer() : null,
      // tailwindcss(),
    ],
    resolve: resolveConfig,
    // Disable default public dir (using Phoenix's)
    publicDir: false,
    build: buildOps(mode),
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    define: {
      /* Note: i
       - mport.meta.env: Runtime access to .env variables
       - define: Compile-time global constant replacement

      Example:
      __API_ENDPOINT__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://prod-api.example.com' 
        : 'http://localhost:3000'
      )
      Then in the code, I can do:
      const apiEndpoint = __API_ENDPOINT__;
      and use it.
      This is dead-code elimination after tree-shaking,
      so it will be removed in production builds.

      */
    },
  };
});

// Waiting for CDN =============================================

// const Cdn = {
//   urlPattern: ({ url }) => url.hostname === "cdn.example.com",
//   handler: "CacheFirst",
//   options: {
//     cacheName: "cdn-assets",
//     cacheableResponse: { statuses: [0, 200] },
//     expiration: {
//       maxEntries: 100,
//       maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
//     },
//   },
// }
