import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

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
    ],
    output: {
      assetFileNames: "assets/[name][extname]",
      chunkFileNames: "assets/[name].js",
      entryFileNames: "assets/[name].js",
    },
  },
  commonjsOptions: {
    exclude: [],
    include: ["vendor/topbar.cjs"],
  },
};

const runtimeCachingNavigation = {
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

const runtimeCachingLongPoll = {
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

const runtimeCachingNetworkFirstAssets = {
  urlPattern: ({ url }) => !url.pathname.startsWith("/assets/"),
  handler: "NetworkFirst",
  options: {
    cacheName: "dynamic-routes",
    networkTimeoutSeconds: 3,
  },
};

const runtimeCachingCacheFirstFonts = {
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

const runtimeCachingCacheFirstImages = {
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

const devOps = {
  enabled: true,
  type: "module",
};

const PWAOpts = {
  devOptions: devOps,
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "robots.txt", "icon-192.png", "icon-512.png"],
  manifest: manifestOpts,
  outDir: "../priv/static/",
  filename: "sw.js",
  manifestFilename: "manifest.webmanifest",
  workbox: {
    globDirectory: "../priv/static/",
    globPatterns: ["assets/**/*.{js,jsx,css,ico,png,svg,webp,woff,woff2}"],
    swDest: "../priv/static/sw.js",
    inlineWorkboxRuntime: true,
    navigateFallback: null,
    runtimeCaching: [
      runtimeCachingNetworkFirstAssets,
      runtimeCachingCacheFirstFonts,
      runtimeCachingCacheFirstImages,
      runtimeCachingLongPoll,
      runtimeCachingNavigation,
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
    plugins: [solidPlugin(), VitePWA(PWAOpts)],
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
