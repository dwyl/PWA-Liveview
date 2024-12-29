# ExLivePWA

A little Elixir-LiveView demo webapp to demonstrate how to make a real-time collaborative app with offline support (PWA) using CRDT.

As an application, two pages:

- a collaborative stock manager. A user clicks and visualizes the decrasing stock level. It is broadcasted to every user. You need a CRDT strategy.
- a collaborative flight animation. Two users can enter their geolocation and share it. Once ready, a user can run a flight animation on a map, using Leaflet. The flight computation and animation works offline as we use a `WebAssembly` WASM module to compute the orthodrome and Leaflet to animate it. It is a simple `Zig` function to compute points using spherical interpolation.

This is what you want with an aggresive cache and code splitting: a loading time of 0.4s (it is not CSS heavy 😬)
<br/>

<img width="619" alt="Screenshot 2024-12-28 at 04 45 26" src="https://github.com/user-attachments/assets/e6244e79-2d31-47df-9bce-a2d2a4984a33" />

# Table of contents

0[Ingredients and comments](#ingredients-and-comments)

1[Guides](#guides)

2[pnpm and Vite setup](#pnpm-and-vite-setup)

3[Vite config](#vite-config)

4[Manifest](#manifest)

5[Yjs for persistence and CRDT strategy](#yjs-for-persistence-and-crdt-strategy)

6[Workbox strategy](#workbox-strategy)

7[Data flow](#data-flow)

8[Video and screenshots](#video-and-screenshots)

[Add navigation](#add-navigation)

[Add WebAssembly](#add-webassembly)

[Demo with auto-spaning map with geolocalisation](#demo-with-auto-spaning-map-with-geolocalisation)


## Ingredients and comments

We integrated a few languages and libraries in the demo:

- `Phoenix LiveView` to orchestrate the app,
- `Yjs` & `y-indexeddb` for local in-brwoser persistence and sync,
- `Vite-plugin-PWA` and `Workbox` for JS bundling and PWA setup,
- `SolidJS` to produce reactive UI,
- `WASM` natively read by `Javascript`
- `Leaflet` to power a map.


[package json](#package-json)

<details><summary>package.json file</summary>

```json
{
  "name": "assets",
  "version": "1.0.0",
  "description": "",
  "main": "app.js",
  "type": "module",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "phoenix": "file:../deps/phoenix",
    "phoenix_html": "file:../deps/phoenix_html",
    "phoenix_live_view": "file:../deps/phoenix_live_view",
    "solid": "link:virtual:pwa-register/solid",
    "solid-js": "^1.9.3",
    "workbox-routing": "^7.3.0",
    "workbox-strategies": "^7.3.0",
    "y-indexeddb": "^9.0.12",
    "yjs": "^13.6.21",
    "leaflet": "^1.9.4"
  },
  "devDependencies": {
    "@tailwindcss/forms": "^0.5.9",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.5",
    "vite-plugin-pwa": "^0.21.1",
    "vite-plugin-solid": "^2.11.0",
    "workbox-window": "^7.3.0"
  },
```
</details>
<br/>

➡️ __Service Worker?__ It is a `Web Worker` with two superpowers:

* it can read/write to the `Cache API` with a request/reponse
* proxy  HTTP GET requests

This means: whenever the frontend sends an HTTP request to the Phoenix backend, the SW can proxy it (`GET` and  `POST` modulo `CORS`) and respond with its cache for `GET`. For `POST`, you need `IndexedDB`.

It works over _HTTPS_.

➡️ __Why `Vite` and not Esbuild__ ?

For developing the app, `Esbuild` is comfortable and perfect.

When you wnat to bring in offline capabilities, you will want to use `Workbox`.
[<img width="913" alt="Screenshot 2024-12-29 at 09 51 54" src="https://github.com/user-attachments/assets/70f5ba5c-65cc-4fe1-82ce-26f6335c1396" />](https://web.dev/learn/pwa/workbox)


However, unless you are very experienced in working with `Workbox` directly,
it is safer to optin for `Vite`
when you want to use `Workbox`. It will generate the "sw.js" from your "vite.config.js" file for you.

This second point is valid for any `LiveView` webapp. 
You should use_ dynamic imports for code splitting_. 
`Vite` can use `Rollup`  to build so you can take advantage
of its code splitting performance.

This means that instead of loading a big chunk of 100kB or more,
you end up with loading several JS files.

For example, in this code, the biggest is `Phoenix` (30kB gzip). 

This is important for the first rendering, and since you are doing SSR,
you want to keep the first rendering performance.

➡️ __Why `SolidJS`__ ?

The idea is to keep the `LiveView` skeleton but with all reactive components replaced, with a __minimal__ impact on the code.

You indeed obviously need a reactive Javascript framework to have an offline responsive UI.

❗️The choice is a question of oponion.
 
Among the frameworks that don't use a virtual DOM, you have  `Svelte` and `SolidJS`.
In fact, both  `Svelte` and `SolidJS` are comparable. in terms of performance.

Since I didn't want to learn `Svelte` which is far from Vanila Javascript, 
I opted for `SolidJS` with is very lightweight and fast,
very close to Vanilla Javascript with a touch of `React`
for the style (like `LiveView`) whilst _not at all_ for `Svelte`.

The main rule with `SolidJS` is: _don't destructure the props_ and you are good to go.

If you go through the code, you will notice that the impact of using `SolidJS` is minimal on the code and very lightweight.



## Guides

Vite PWA: <https://vite-pwa-org.netlify.app/guide/>

Mozilla: <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers>

* how vite-plugin-pwa builds the service worker:
<https://vite-pwa-org.netlify.app/guide/cookbook.html>

It will generate two files  that are served by `Phoenix`, in the root folder "priv/static":
`sw.js`  and the `manifest.webmanifest` files.

You need to modify the `static_path` accordingly (see the paragraph "Vite config").

## pnpm and Vite setup

Make your life easier with `pnpm` or `bun`.

* pnpm: Save space, gain speed and confidence with symlinked libraries
<https://pnpm.io/installation>

* Vite:  [Check the package.json](#package-json)
  
```
pnpm add -D vite
```

## Vite config

It will use two plugins:   [solidPlugin](https://github.com/solidjs/vite-plugin-solid)  and [VitePWA](https://vite-pwa-org.netlify.app/)

❗️ For the `solidPlugin`, it is important to pass the JSX extensions to  `resolver.extension` to be able to compile 
JSX extension files. This is because  `SolidJS` identifies these files as components to parse the JSX.

```js
resolve: {
  extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
},`
```

❗️ In the `VitePWA` configuration, it is important to set the key `workbox.inlineWorkboxRuntime` to `true`
in order to produce a _unique_  "sw.js" file.

Otherwise `Vite/Workbox` will produce some timestamped saved into the directory "priv/static", 
which is __impossible__ since `Phoenix` will serve thme.
This way, only "sw.js" will be placed there, which `Phoenix` can serve.


```js
workbox: {
  inlineWorkboxRuntime: true,
  ...
}
```


✅ modify the static paths: the files "sw.js" and "manifest.webmanifest" are generated for you by `Vite` from the "vite.config.js" file.

```elixir
def static_paths,
    do: ~w(assets fonts images favicon.ico robots.txt  sw.js manifest.webmanifest)
```

We also pass the routes and strategies to the Service Worker in `workbox.runtimeCaching`.
to an ul pattern, you pass a so-called handler or strategy: from cache or from network first.

We pass all the Javascript files located in "/assets/js" to `Rollup` to compile, minify and chunk them.

❗️ Note how `topbar` needs its own treatment. We also need to rename the extensoin to `cjs`.

<details><summary>vite.config.js file</summary>

```js
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
```
</details>
<br/>

## Manifest

The "manifest.webmanifest" file will be generated from "vite.config.js".

```json
{
  "name": "ExLivePWA",
  "short_name": "ExLivePWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "lang": "en",
  "scope": "/",
  "description": "A LiveView + SolidJS PWA and Yjs demo",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/images/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/images/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
<br/>

✅ Insert the links to the icons in the (root layout) HTML:

```html
<!-- root.html.heex -->
<head>
[...]
<link rel="icon-192" href={~p"/images/icon-192.png"} />
<link rel="icon-512" href={~p"/images/icon-512.png"} />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="manifest" href="/manifest.webmanifest" />
[...]
</head>
```

### Icons

<https://vite-pwa-org.netlify.app/assets-generator/#pwa-minimal-icons-requirements>

You will need is to have at least two very low resolution icons of size 192 and 512, one extra of 180 for OSX and one 62 for Microsoft, all placed in "/priv/static/images".

A generator: <https://favicon.inbrowser.app/tools/favicon-generator>

## Yjs for persistence and CRDT strategy

YJS's IndexedDB persistence handles offline support automatically.

When offline:

- Users can still modify the stock locally
- Changes are stored in IndexedDB
- When back online, YJS will sync changes


## Workbox strategy

Thel available strategies and use cases:

* `CacheFirst` is best for static assets: fonts, images. It checks cahce first. Only makes network request if resource isn't in cache

* `NetworkFirst` is best for API calls, dynamic content. It tries network request first, and falls back to cached content if network fails/times out. It prioritizes fresh content with offline fallback

* `StaleWhileRevalidate`. It serves cached version immediately (if available). It updates cache in background for next time.
It is best for: News feeds, social media content, frequently updated content
Balances speed with content freshness

* `NetworkOnly`. It never uses cache, always fetches from network. You need real-time data accuracy

* `CacheOnly`. Only serves from cache, never makes network requests


Each strategy can be configured with additional options:

- `cacheName`: Identify different caches
- `expiration`: Control cache size and age
- `networkTimeoutSeconds`: Timeout for network requests
- `matchOptions`: Fine-tune cache matching
- `plugins`: Add custom caching behaviors


### needRefresh and offLineReady

In Vite's GitHub repo, <https://github.com/vite-pwa/vite-plugin-pwa/tree/main/docs/frameworks>,
you pick your favorite framework to setup `needRefresh` and `offlineReady`.

You need `workbox-window` as a dev dependency.

You can use the built-in Vite virtual module `virtual:pwa-register/solid` for `SolidJS`.
It will return createSignal stateful values (`createSignal<boolean>`) for offlineReady and `needRefresh`.

## Data flow

### Synchronization Flow

- User A changes stock → YJS update → Hook observes → LiveView broadcast
- LiveView broadcasts to all users → Hook receives "new_stock" → YJS update
- YJS update → All components observe change → UI updates


## Video and Screenshots

* Chrome browser menu:
    - the manifest file,
    - the Service Worker,
    - the Cache storage,
    - the IndexedDB database:
<br/>
<img width="282" alt="Screenshot 2024-12-28 at 19 26 09" src="https://github.com/user-attachments/assets/33b5ca41-0dfb-4594-8e63-793741fcd175" />

* Memory used for the Service Worker `Cache`, `IndexedDB` with `y-indexedb`
<br/>
<img width="474" alt="Screenshot 2024-12-28 at 19 25 38" src="https://github.com/user-attachments/assets/3b9fe308-f790-42f3-9d1a-6acccfce5606" />

* The "proof" of the installed PWA (TODO: change the named of this repo).
  <br/>
<img width="323" alt="Screenshot 2024-12-28 at 12 45 10" src="https://github.com/user-attachments/assets/c13ae6d3-64e1-4126-abb8-ad1fdbb1e622" />



## Add Navigation

You intercept request in the form `request.mode === "navigate"` and 
serve the assets accordingly from the cache when offline.

## Add WebAssembly and a collaborative map

A WASM module is  a static asset so it will be cached when called.
Javascript can run it.
Let's check!

## Demo with auto-spaning map with geolocalisation

As long as the web app is initialized with network connectivity, 
you can create a web app that uses geolocation even when offline.

Indeed, GPS functionality on mobile phones operates independently of internet
or cellular connections.

Your device's GPS receiver can obtain location data from satellites without requiring network access



