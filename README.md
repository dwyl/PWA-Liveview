# ExLivePWA

A little Elixir-LiveView demo webapp to demonstrate how to make a real-time collaborative app with offline support (PWA) using CRDT.

As an application, two pages:


- a collaborative stock manager. A user clicks and visualizes the stock level in an animated read-only `<input type=range/>`.
It is broadcasted to every user. You need a CRDT strategy.
<br/>
<div align="center"><img width="1425" alt="Screenshot 2024-12-29 at 13 15 19" src="https://github.com/user-attachments/assets/f5e68b4d-6229-4736-a4b3-a60fc813b6bf" /></div>
<br/>
- a collaborative flight animation. Two users can enter their geolocation and share it.
Once ready, a great circle joining these two points is drawn on the map. The data is saved and sent
to `Phoenix` which in turn saves into the backend database.
A user can run a flight animation on a map, using Leaflet.
The flight computation and animation works offline as we use a `WebAssembly` WASM module
to compute the orthodrome and Leaflet to animate it.
It is `Zig` code that computes points (lat/long) every 1 degree along the great circle joining these two points.
<br/>
<div align="center"><img width="635" alt="Screenshot 2024-12-30 at 07 39 51" src="https://github.com/user-attachments/assets/2eb459e6-29fb-4dbb-a101-841cbad5af95" /></div>
<br/>
With an aggresive cache and code splitting, you get an FCP (first content loading time) of 0.4s and a full render of 1.0s for the page with the map and WASM.
<br/>

<div align="center"><img width="619" alt="Screenshot 2024-12-28 at 04 45 26" src="https://github.com/user-attachments/assets/e6244e79-2d31-47df-9bce-a2d2a4984a33" /></div>

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

We integrated a few languages and libraries in the demo.

- `Phoenix LiveView` to orchestrate the app,
- `Yjs` & `y-indexeddb` for local in-browser persistence and sync,
- `Vite` and `Workbox` for JS bundling and PWA setup,
- `SolidJS` to produce reactive UI,
- `Zig` compiled to `WASM` natively read by `Javascript` in the browser,
- `Leaflet` to power a map.
- `SQlite` backend database



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
 
> Among the frameworks that don't use a virtual DOM, you have  `Svelte` and `SolidJS`.
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

‼️ In the `VitePWA` configuration, it is important to set the key `workbox.inlineWorkboxRuntime` to `true`
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
  "description": "A Phoenix LiveView PWA demo webapp",
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
<br/>

* Memory used for the Service Worker `Cache`, `IndexedDB` with `y-indexedb`
<br/>
<img width="474" alt="Screenshot 2024-12-28 at 19 25 38" src="https://github.com/user-attachments/assets/3b9fe308-f790-42f3-9d1a-6acccfce5606" />
<br/>

* The "proof" of the installed PWA (TODO: change the named of this repo).
<br/>
<img width="323" alt="Screenshot 2024-12-28 at 12 45 10" src="https://github.com/user-attachments/assets/c13ae6d3-64e1-4126-abb8-ad1fdbb1e622" />
<br/>

* Screenshot of the demo app


## Add Navigation

You intercept request in the form `request.mode === "navigate"` and 
serve the assets accordingly from the cache when offline.

## Add WebAssembly and a collaborative map

A WASM module is a static asset so it will be cached when called.
Javascript can run it.

We add the `Vite` plugin `vite-plugin-wasm` to bring in WASM files,
so the list of our plugins is:

`plugins: [wasm(), solidPlugin(), VitePWA(PWAOpts)]`. 

We compile  the `Zig` into WASM format for the browser with `.ReleaseSmall`.
This brings down the size from 450kB down to 13kB.

This module computes the lat/long every 1 degree along the great circle joining two points.
It uses [the Haversine formulas](https://en.wikipedia.org/wiki/Haversine_formula).

It is displayed as a polygone with `Leaflet`.

> Note the size of the WASM module when compiled to `.ReleaseSmall`: _13kB_
whilst `Leaflet` is _43kB_ and `Phoenix_live_view.js` is 30kB.

<details>
  <summary>Weight of files</summary>

  ```sh
../priv/static/manifest.webmanifest                 0.36 kB
../priv/static/assets/great_circle.wasm            13.16 kB
../priv/static/assets/mapHook.css                  15.04 kB │ gzip:  6.38 kB
../priv/static/assets/onlineStatus.js               0.37 kB │ gzip:  0.25 kB
../priv/static/assets/bins.js                       0.43 kB │ gzip:  0.26 kB
../priv/static/assets/initYJS.js                    0.48 kB │ gzip:  0.30 kB
../priv/static/assets/SolidComp.js                  0.73 kB │ gzip:  0.45 kB
../priv/static/assets/refreshSW.js                  0.85 kB │ gzip:  0.50 kB
../priv/static/assets/great_circle.js               0.85 kB │ gzip:  0.50 kB
../priv/static/assets/solHook.js                    0.88 kB │ gzip:  0.43 kB
../priv/static/assets/preload-helper.js             0.99 kB │ gzip:  0.60 kB
../priv/static/assets/counter.js                    1.40 kB │ gzip:  0.73 kB
../priv/static/assets/mapHook.js                    1.42 kB │ gzip:  0.85 kB
../priv/static/assets/y-indexeddb.js                2.82 kB │ gzip:  1.21 kB
../priv/static/assets/topbar.js                     3.05 kB │ gzip:  1.52 kB
../priv/static/assets/app.js                        3.86 kB │ gzip:  1.53 kB
../priv/static/assets/workbox-window.prod.es5.js    5.72 kB │ gzip:  2.35 kB
../priv/static/assets/web.js                       18.10 kB │ gzip:  7.28 kB
../priv/static/assets/phoenix.js                   20.26 kB │ gzip:  6.16 kB
../priv/static/assets/yjs.js                       85.58 kB │ gzip: 26.28 kB
../priv/static/assets/phoenix_live_view.esm.js     96.62 kB │ gzip: 30.31 kB
../priv/static/assets/leaflet-src.js              149.70 kB │ gzip: 43.40 kB
```
</details>

> It does note really make sense to use a WASM module for this as JavaScript
is probably fast enough to compute this as well. It is more to demonstrate what can be done.

<details><summary>Zig code to produce an array of Great Circle points between two coordinates</summary>

```zig
// extern "env" fn consoleLog(ptr: [*]const u8, len: usize) void;

const std = @import("std");
const math = std.math;
const toRadian = math.degreesToRadians;

// Constants for geometric calculations
const RADIANS_PER_DEGREE = math.pi / 180.0;
const DEGREES_PER_RADIAN = 180.0 / math.pi;
const EARTH_RADIUS_KM = 6371.0; // Earth's mean radius in kilometers
// One degree of latitude or longitude in kilometers
const ONE_DEGREE_KM = 111.0;

// Configuration
const DEFAULT_ANGLE_INCREMENT_DEGREES: f64 = 1.0; // Spacing between points in degrees
const ANGLE_INC_RAD = DEFAULT_ANGLE_INCREMENT_DEGREES * RADIANS_PER_DEGREE;

/// Represents a geographic point with latitude and longitude in degrees.
const Point = struct { lat: f64, lon: f64 };

var num_points: usize = 0;

var wasm_allocator = std.heap.wasm_allocator;

/// Converts Cartesian coordinates to geographic latitude and longitude.
fn cartesianToGeographic(x: f64, y: f64, z: f64) Point {
    return Point{
        .lat = std.math.atan2(z, std.math.sqrt(x * x + y * y)) * DEGREES_PER_RADIAN,
        .lon = std.math.atan2(y, x) * DEGREES_PER_RADIAN,
    };
}

/// Calculate the angular distance between two points on the surface of a sphere
export fn calculateHaversine(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) f64 {
    const start_lat_rad = toRadian(start_lat_deg);
    const start_lon_rad = toRadian(start_lon_deg);
    const end_lat_rad = toRadian(end_lat_deg);
    const end_lon_rad = toRadian(end_lon_deg);

    const haversine =
        math.pow(f64, math.sin((end_lat_rad - start_lat_rad) / 2), 2) +
        math.cos(start_lat_rad) * math.cos(end_lat_rad) *
        math.pow(f64, math.sin((end_lon_rad - start_lon_rad) / 2), 2);

    return 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine));
}

/// Calculate the great-circle distance between two geographic coordinates.
fn getGreatCircleDistance(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) f64 {
    const angular_distance = calculateHaversine(
        start_lat_deg,
        start_lon_deg,
        end_lat_deg,
        end_lon_deg,
    );

    return angular_distance * EARTH_RADIUS_KM;
}

/// Calculate the number of points for interpolation based on distance.
fn calculateNumPoints(angular_distance: f64, angle_increment_rad: f64) usize {
    return @as(usize, @intFromFloat(@ceil(angular_distance / angle_increment_rad))) + 1;
}

fn computeNumPoints(angular_distance: f64) usize {
    if (angular_distance * DEGREES_PER_RADIAN < 1.0) {
        return 2;
    }

    return calculateNumPoints(angular_distance, ANGLE_INC_RAD);
}

export fn getBufferSize() usize {
    return num_points * 2 * 8;
}

export fn memfree(ptr: [*]u8, len: usize) void {
    const slice = ptr[0..len];
    wasm_allocator.free(slice);
}

/// Computes great-circle points between two geographic coordinates.
export fn computeGreatCirclePoints(
    start_lat_deg: f64,
    start_lon_deg: f64,
    end_lat_deg: f64,
    end_lon_deg: f64,
) [*]f64 {
    // log("Computing great circle points\n");
    // Convert coordinates to radians
    const start_lat_rad = toRadian(start_lat_deg);
    const start_lon_rad = toRadian(start_lon_deg);
    const end_lat_rad = toRadian(end_lat_deg);
    const end_lon_rad = toRadian(end_lon_deg);

    const angular_distance = calculateHaversine(
        start_lat_deg,
        start_lon_deg,
        end_lat_deg,
        end_lon_deg,
    );

    num_points = computeNumPoints(angular_distance);

    // If the points are very close, return just the two points
    if (num_points == 2) {
        const buffer = wasm_allocator.alloc(f64, 4) catch unreachable;
        buffer[0] = start_lat_deg;
        buffer[1] = start_lon_deg;
        buffer[2] = end_lat_deg;
        buffer[3] = end_lon_deg;
        return buffer.ptr;
    }

    const buffer: []f64 = wasm_allocator.alloc(f64, num_points * 2) catch unreachable;

    const sin_angular_distance = math.sin(angular_distance);

    var i: usize = 0;
    while (i < num_points) : (i += 1) {
        const fraction = @as(f64, @floatFromInt(i)) / @as(f64, @floatFromInt(num_points - 1));

        // Calculate interpolation coefficients
        const coeff_start =
            if (sin_angular_distance == 0)
            1 - fraction
        else
            math.sin((1 - fraction) * angular_distance) / sin_angular_distance;

        const coeff_end =
            if (sin_angular_distance == 0)
            fraction
        else
            math.sin(fraction * angular_distance) / sin_angular_distance;

        // Calculate 3D cartesian coordinates
        const x =
            coeff_start * math.cos(start_lat_rad) * math.cos(start_lon_rad) +
            coeff_end * math.cos(end_lat_rad) * math.cos(end_lon_rad);

        const y =
            coeff_start * math.cos(start_lat_rad) * math.sin(start_lon_rad) +
            coeff_end * math.cos(end_lat_rad) * math.sin(end_lon_rad);

        const z =
            coeff_start * math.sin(start_lat_rad) +
            coeff_end * math.sin(end_lat_rad);

        // Convert back to geographic coordinates
        const point = cartesianToGeographic(x, y, z);

        buffer[i * 2] = point.lat;
        buffer[i * 2 + 1] = point.lon;
    }

    return buffer.ptr;
}

// fn log(msg: []const u8) void {
//     consoleLog(msg.ptr, msg.len);
// }

```
</details>
<br/>

Then you can run the module in the browser:

```js
async function loadWasm() {
  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("./assets/zig_gc.wasm")
  );
  return instance.exports;
```

## Demo with auto-spaning map with geolocalisation

As long as the web app is initialized with network connectivity, 
you can create a web app that uses geolocation even when offline.

Indeed, GPS functionality on mobile phones operates independently of internet
or cellular connections.

Your device's GPS receiver can obtain location data from satellites without requiring network access



