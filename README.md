# Offline first Phoenix LiveView PWA

An example of a real-time, collaborative multi-page web app built with `Phoenix LiveView`.

It is designed for offline-first ready; it is packaged as a [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) and uses CRDTs or local state and reactive components.

Offline first solutions naturally offloads most of the reactive UI logic to JavaScript.

When online, we use LiveView "hooks", while when offline, we render the reactive components.

It uses `Vite` as the bundler.

> While it can be extended to support multiple pages, dynamic page handling has not yet been tested nor implemented.

**Results**:

- deployed on Fly.io at: <https://solidyjs-lively-pine-4375.fly.dev/>
- standalone Phoenix LiveView app of 2.1 MB
- memory usage: 220MB
- image weight: 52MB of Fly.io, 126MB on Docker Hub (`Debian` based)
- client code can be updated via the Service Worker lifecycle

QRCode to check multi users, from on a mobile device:

<img alt="qr-code" width="200" src="https://github.com/user-attachments/assets/9326182b-9933-45ea-9a0b-aeea9c197c24" />

## Table of Contents

- [Offline first Phoenix LiveView PWA](#offline-first-phoenix-liveview-pwa)
  - [Table of Contents](#table-of-contents)
  - [What?](#what)
  - [Why?](#why)
  - [Design goals](#design-goals)
  - [Common pitfall of combining LiveView with CSR components](#common-pitfall-of-combining-liveview-with-csr-components)
  - [Architecture](#architecture)
    - [Tech overview](#tech-overview)
    - [Implementation highlights](#implementation-highlights)
  - [About the LiveStock page](#about-the-livestock-page)
  - [About PWA](#about-pwa)
    - [Updates life-cycle](#updates-life-cycle)
  - [Usage](#usage)
  - [Diagrams and data flow](#diagrams-and-data-flow)
    - [Architecture flow](#architecture-flow)
    - [State Synchronization Flow](#state-synchronization-flow)
    - [Server authority (in our scenario)](#server-authority-in-our-scenario)
  - [Details of Pages](#details-of-pages)
    - [LiveStock Manager](#livestock-manager)
    - [LiveFlight](#liveflight)
  - [Navigation](#navigation)
  - [Vite](#vite)
    - [Configuration and settings](#configuration-and-settings)
      - [Watcher](#watcher)
      - [Tailwind](#tailwind)
      - [Client Env](#client-env)
    - [Static assets](#static-assets)
    - [VitePWA plugin and Workbox Caching Strategies](#vitepwa-plugin-and-workbox-caching-strategies)
  - [Yjs and y\_ex](#yjs-and-y_ex)
  - [Misc](#misc)
    - [Presence through Live-navigation](#presence-through-live-navigation)
    - [CSP rules and evaluation](#csp-rules-and-evaluation)
    - [Icons](#icons)
    - [Manifest](#manifest)
  - [Performance](#performance)
    - [\[Optional\] Page Caching](#optional-page-caching)
  - [Publish](#publish)
  - [Fly volumes](#fly-volumes)
  - [Documentation source](#documentation-source)
  - [Resources](#resources)
  - [License](#license)
  - [Credits](#credits)

## What?

**Context**: we want to experiment PWA webapps using Phoenix LiveView.

What are we building? A two pages webap:

- LiveStock. On the first page, we mimic a shopping cart where users can pick items until stock is depleted, at which point the stock is replenished. Every user will see and can interact with this counter
- LiveFlight. On the second page, we propose an interactive map with a form with two inputs where **two** users can edit collaboratively a form to display markers on the map and then draw a great circle between the two points.

> You need an api key to render the Maptiler vector tiles. You can see the Service Worker in action in the LiveMap page when you go offline as the tiles are cached. This is naturally only true if you already visited these tiles, thus loaded them.

## Why?

Traditional Phoenix LiveView applications face several challenges in offline scenarios:

1. **no Offline Interactivity**:
   Some applications need to maintain interactivity even when offline, preventing a degraded user experience.

2. **no Offline Navigation**:
   User may need to navigate through pages.

3. **WebSocket Limitations**:
   LiveView's WebSocket architecture isn't naturally suited for PWAs, as it requires constant connection for functionality. When online, we use `Phoenix.Channel` for real-time collaboration.

4. **State Management**:
   It is challenging to maintain consistent state across network interruptions between the client and the server.

5. **Build tool**:
   We need to setup a Service Worker to cache HTML pages and static assets to work offline, out of the LiveView goodies.

## Design goals

- **collaborative** (online): Clients sync via _pubsub updates_ when connected, ensuring real-time consistency.
- **optimistic UI**: The function "click on stock" assumes success and will reconciliate later.
- **embedded database**: We use `SQLite`.
- **Offline-First**: The app remains functional offline (through reactive JS components), with clients converging to the correct state on reconnection.
- **PWA**: Full PWA features, meaning it can be _installed_ as a standalone app and can be _updated_. A `Service Worker` runs in a separate thread and caches assets. It is setup with `VitePWA`
- **Business Rules**:

  - For the stock page:
    When users resync, the server enforces a "lowest stock count" rule: if two clients pick items offline, the server selects the lowest remaining stock post-merge, rather that summing the reduction, for simplicity.
  - For the LiveFlight page, none.

## Common pitfall of combining LiveView with CSR components

The client-side rendered components are - when online - mounted via hooks under the tag `phx-update="ignore"`.

These components have they own lifecycle. They will leak or stack duplicate components if you don't cleanup and unmount them.
The same applies to "subscriptions/observers" primitives from the state manager. You must unsubscribe, otherwise you might get multiples calls and weird behaviours.

⭐️ The "hook" comes with a handy lifecyle and the `destroyed` callback is essential.

`SolidJS` makes this easy as it renders a `cleanupSolid` callback (where you take a reference to the SolidJS component in the hook).
You also need to clean _subscriptions_ (when using a store manager).

The same applies when you navigate offline; you have to run cleanup functions, both on the components and on the subsriptions/observers from the state manager.

## Architecture

### Tech overview

| Component                  | Role                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vite                       | Build and bundling framework                                                                                      |
| SQLite                     | Embedded persistent storage of latest Yjs document                                                                |
| Phoenix LiveView           | UI rendering, incuding hooks                                                                                      |
| PubSub / Phoenix.Channel   | Broadcast/notifies other clients of updates / conveys CRDTs binaries on a separate websocket (from te LiveSocket) |
| Yjs / Y.Map                | Holds the CRDT state client-side (shared)                                                                         |
| Valtio                     | Holds local ephemeral state                                                                                       |
| y-indexeddb                | Persists state locally for offline mode                                                                           |
| SolidJS                    | renders reactive UI using signals, driven by Yjs observers                                                        |
| Hooks                      | Injects communication primitives and controls JavaScript code                                                     |
| Service Worker / Cache API | Enable offline UI rendering and navigation by caching HTML pages and static assets                                |
| Leaflet                    | Map rendering                                                                                                     |
| MapTiler                   | enable vector tiles                                                                                               |
| WebAssembly container      |  high-performance calculations for map "great-circle" routes use `Zig` code compiled to `WASM`                    |

### Implementation highlights

- **Offline capabilities**:

  - LiveStock page: Edits are saved to `y-indexeddb`
  - LiveFlight page: the "airports" list is saved in localStorage

- **State Management**:
  We use different approaches based on the page requirements:

  - CRDT-based synchronization with Y.js featuring IndexedDB and y_ex server-side for Stock Manager page. It uses an embedded SQLite database for server-side state management synchronization
  - Local state management (Valtio) for the collaborative Flight Map page with no database persistence of the state

- **Build tool**:
  We use Vite as the build tool to bundle and optimize the application and enable PWA features seamlessly.
  The Service Worker to cache HTML pages and static assets.

- **Synchronization Flow**:

  - LiveStock page:
    Client sends all pending `Yjs` updates on (re)connection.
    The client updates his local `Y-Doc` with the server responses.
    `Y-Doc` mutations are observed and trigger UI rendering, and reciprocally, UI modifications update the `Y-Doc` and propagate mutations to the server.
  - LiveFlight page:
    The inputs (selected airports) are saved to a local state (`Valtio` proxies).
    Local UI changes mutate the state and are sent to the server. The server broadcasts the data.
    We have state observers which update the UI if the origin is not remote.

- **Server Processing**:

  - LiveStock page:
    Merges updates into the `SQLite3`-stored `Y-Doc` (using `y_ex`).
    Applies business rules (e.g., "stock cannot be negative").
    Broadcasts the approved state.
    Clients reconcile local state with the server's authoritative version
  - LiveFlight page:
    The Phoenix server is used to receive/emit messages.

- **Data Transport**:

  - LiveStock page:
    Use `Phoenix.Channel` to transmit the `Y-Doc` state as binary.
    This minimises bandwidth usage and decouples CRDT synchronisation from the LiveSocket.
    Implementation heavily inspired by the repo <https://github.com/satoren/y-phoenix-channel> made by the author of `y_ex`.
  - LiveFlight page:
    We use the LiveSocket as the data flow is small.

- **Component Rendering Strategy**:
  - online: use LiveView hooks
  - offline: hydrate the cached HTML documents with reactive JavaScript components

## About the LiveStock page

You have both CRDT-based synchronization (for convergence) and server-enforced business rules (for consistency).
We thus have two Layers of Authority:

- CRDT Sync Layer (Collaborative):
  Clients and server synchronize using Yjs CRDTs to merge concurrent edits _deterministically_.
  Clients can modify their local Y-Doc freely (offline or online).

- Business Rules Layer (Authoritative):
  The server is authoritative. It validates updates upon the business logic (e.g., stock validation), and broadcasts the canonical state to all clients.
  Clients propose changes, but the server decides the final state (e.g., enforcing stock limits).

## About PWA

A Progressive Web App (PWA) is a type of web application that provides an app-like experience directly in the browser.

It has:

- offline support
- is "instalable":

<img width="135" alt="Screenshot 2025-05-08 at 22 02 40" src="https://github.com/user-attachments/assets/dddaaac7-9255-419b-a5ad-44a2a891e93a" />
<br/>

The core components are setup using `Vite` in the _vite.config.js_ file.

- **Service Worker**:
  A background script - separate thread - that acts as a proxy: intercepts network requests and enables offline caching and background sync.
  We use the `VitePWA` plugin to enable the Service Worker life-cycle (manage updates)

- Web App **Manifest** (manifest.webmanifest)
  A JSON file that defines the app’s name, icons, theme color, start URL, etc., used to install the webapp.
  We produce the Manifest with `Vite` via in the "vite.

- HTTPS (or localhost):
  Required for secure context: it enables Service Workers and trust.

`Vite` builds the SW for us via the `VitePWA` plugin by declarations in "vite.config.js". Check [Vite](#vite)

The SW is started by the main script, early, and must preload all the build static assets as the main file starts before the SW runtime caching is active.

Since we want offline navigation, we precache the rendered HTML as well.

### Updates life-cycle

A Service Worker (SW) runs in a _separate thread_ from the main JS and has a unique lifecycle made of 3 key phases: install / activate / fetch

In action:

1. Make a change in the client code, git push/fly deploy:
   -> a button appears and the dev console shows a push and waiting stage:

<img width="1413" alt="Screenshot 2025-05-08 at 09 40 28" src="https://github.com/user-attachments/assets/a4086fe3-4952-48de-818c-b12fe1819823" />
<br/>

2. Click the "refresh needed"
   -> the Service Worker and client claims are updated seamlessly, and the button is in the hidden "normal" state.

<img width="1414" alt="Screenshot 2025-05-08 at 09 41 55" src="https://github.com/user-attachments/assets/7687fd61-f5b8-4298-ab96-144cdb297e6e" />
</br>

Service Workers don't automatically update unless:

- The sw.js file has changed (based on byte comparison).

- The browser checks periodically (usually every 24 hours).

- When a new SW is detected:

  - New SW enters installing state.

  - It waits until no existing clients are using the old SW.

  - Then it activates.

```mermaid
sequenceDiagram
  participant User
  participant Browser
  participant App
  participant OldSW as Old Service Worker
  participant NewSW as New Service Worker

  Browser->>OldSW: Control App
  App->>Browser: registerSW()

  App->>App: code changes
  Browser->>NewSW: Downloads New SW
  NewSW->>Browser: waiting phase
  NewSW-->>App: message: onNeedRefresh()
  App->>User: Show <button> onNeedRefresh()
  User->>App: Clicks Update Button
  App->>NewSW: skipWaiting()
  NewSW->>Browser: Activates
  NewSW->>App: Takes control (via clients.claim())
```

## Usage

```elixir
# mix.exs

# server component of Yjs to manage Y_Doc server-side
{:y_ex, "~> 0.7.3"},
# SQLite3
{:exqlite, "0.30.1"},
# fetching the CSV airports
{:req, "~> 0.5.8"},
# parsing the CSV airports
{:nimble_csv, "~> 1.2"},
```

Client package are setup with `pnpm`: check [▶️ package.json](https://github.com/dwyl/PWA-Liveview/blob/main/assets/package.json)

1/ **dev** setup with _IEX_ session

```sh
# install all dependencies including Vite
mix deps.get
pnpm install --prefix assets
# start Phoenix server, it will also compile the JS
iex -S mix phx.server
```

2/ Run a local Docker container in **mode=prod**

```sh
docker compose up --build
```

[▶️ Dockerfile](https://github.com/dwyl/PWA-Liveview/blob/main/Dockerfile)

[▶️ docker-compose.yml](https://github.com/dwyl/PWA-Liveview/blob/main/docker-compose.yml)

> You can take a look at the build artifacts by running into another terminal

```sh
> docker compose exec -it web cat  lib/solidyjs-0.1.0/priv/static/.vite/manifest.json
```

3/ Pull from `Docker Hub`:

```sh
docker run -it  -e SECRET_KEY_BASE=oi37wzrEwoWq4XgnSY3VRbKUhNxvdowJ7NOCrCECZ6V7WyPDNHuQp36oat+aqOkS  -p 80:4000  --rm ndrean/pwa-liveview:latest
```

and visit <http://localhost>

## Diagrams and data flow

### Architecture flow

<details>
<summary>Architecture diagram</summary>

```mermaid
flowchart TD
    subgraph "Client"
        UI["UI Components <br> (SolidJS)"]
        YDoc["Local Y-Doc <br> (CRDT State)"]
        IndexedDB["IndexedDB <br> (Offline Storage)"]
        YObserver["Y.js **Observer** <br>(__Component__ listener ) <br>
        (__Hook__ listener)"]

        UI <--> YDoc
        YDoc <--> IndexedDB
        YObserver --> UI
        YDoc --> YObserver
    end


    subgraph "Server (Elixir)"
        YjsChannel["Yjs Channel"]

        YEx["Yex (y-crdt)<br>(CRDT Processing)"]
        BusinessRules["Business Rules <br>(apply_if_lower?)"]
        DB["SQLite<br>(Persisted Y-Doc)"]

        YjsChannel <--> DB
        YjsChannel <--> YEx
        YjsChannel <--> BusinessRules
    end

    YDoc <--> PhoenixChannel
    PhoenixChannel <--> YjsChannel


    class BusinessRules highlight
    class YDoc,YEx highlight
```

</details>
<br/>

### State Synchronization Flow

```mermaid
sequenceDiagram
    participant User

    participant SolidJS
    participant Yjs
    participant Hook
    participant Channel
    participant OtherClients
    participant Db

    User->>SolidJS: Interact with UI
    SolidJS->>Yjs: Update local state
    Yjs->>Hook: Trigger update event
    Hook->>Channel: Send state to server
    Channel->>Yjs: merge db state with update
    Channel->>Db: persist merged state
    Channel->>PubSub: Broadcast update
    PubSub->>OtherClients: Distribute changes
    OtherClients->>Yjs: Apply update
    Yjs->>SolidJS: Update UI
```

- **from the reactive component to Yjs**:
  We have a reactive component.
  A local "onClick" handler mutates the `Y.Map` type of the Y_Doc.
  We set an "observer" on the type `Y.Map` of the YDoc. It updates the "signal":

  - from a local click
  - or remote of the YDoc.

### Server authority (in our scenario)

<details>
<summary>Server Authority in collaborative mode
</summary>

```mermaid
sequenceDiagram
    participant ClientA
    participant ClientB
    participant Server
    participant DB

    Note over ClientA,ClientB: Online Scenario
    ClientA->>Server: "init-client" <br> (join channel)
    Server->>DB: Fetch Y-Doc state
    DB-->>ClientA: Y-Doc (current counter) <br> "init" (binary update)
    ClientA->>ClientA: Apply update (Yjs)
    ClientA->>Server: "yjs-update" <br>(local edit)
    alt Business Rule: Passes
        Server->>Server: apply_if_lower?(old, new)
        Server->>DB: Maybe save merged Y-Doc
        Server->>ClientA: "pub-update"
        Server->>ClientB: "pub-update" <br> (broadcast)
    else Business Rule: Reject
        Server->>ClientA: "pub-update" <br> (revert client to server state)
    end

    Note over ClientA,ClientB: Offline Scenario
    ClientB->>ClientB: Local edit <br>(counter=3, offline)
    ClientB->>ClientB: Save to y-indexeddb
    ClientB->>Server: Reconnect
    ClientB->>Server: "yjs-update" <br>(offline edits)
    Server->>DB: Load Y-Doc
    Server->>Server: apply_if_lower?(old=5, new=3)
    Server->>DB: Save merged Y-Doc (counter=3)
    Server->>ClientA: "pub-update" (counter=3)
    Server->>ClientB: "pub-update" (ack)
```

</details>
<br/>

## Details of Pages

### LiveStock Manager

Available at `/`.

You click on a counter and it goes down..! The counter is broacasted and handled by a CRDT backed into a SQLite table.
A user can click offline, and on reconnection, all clients will get updated with the lowest value (business rule).

<img width="1404" alt="Screenshot 2025-05-08 at 22 05 15" src="https://github.com/user-attachments/assets/ba8373b5-defc-40f9-b497-d0086eb10ccc" />
<br/>

### LiveFlight

Available at `/map`.

It displays an _interactive_ and _collaborative_ (two-user input) route planning with vector tiles.
The UI displays a form with two inputs, which are pushed to Phoenix and broadcasted via Phoenix PubSub. A marker is drawn by `Leaflet` to display the choosen airport on a vector-tiled map using `MapTiler`.

<img width="1398" alt="Screenshot 2025-05-08 at 22 06 29" src="https://github.com/user-attachments/assets/1c5a82b2-8302-44a4-93dd-87ac215105e3" />
<br/>

Key features:

- collaborative input
- `Valtio`-based _local_ (browser only) ephemeral state management (no complex conflict resolution needed)
- WebAssembly-powered great circle calculations: CPU-intensive calculations works offline
- Efficient map rendering with MapTiler and _vector tiles_ with smaller cache size (vector data vs. raster image files)

> [**Great circle computation**] It uses a WASM module. `Zig` is used to compute a "great circle" between two points, as a list of `[lat, long]` spaced by 100km. The `Zig` code is compiled to WASM and available for the client JavaScript to run it. Once the list of successive coordinates are in JavaScript, `Leaflet` can use it to produce a polyline and draw it into a canvas. We added a WASM module to implement great circle route calculation as a showcase of WASM integration. A JAvascript alternative would be to use [turf.js](https://turfjs.org/docs/api/greatCircle).
> check the folder "/zig-wasm"

> [**Airport dataset**] We use a dataset from <https://ourairports.com/>. We stream download a CSV file, parse it (`NimbleCSV`) and bulk insert into an SQLite table. When a user mounts, we read from the database and pass the data asynchronously to the client via the liveSocket on the first mount. We persist the data in `localStorage` for client-side search. The socket "airports" assign is then pruned to free the server's socket.

▶️ [Airports](<(https://github.com/dwyl/PWA-Liveview/blob/main/lib/LiveviewPwa/db/Airports.ex)>), [LiveMap](https://github.com/dwyl/PWA-Liveview/blob/main/lib/LiveviewPwaweb/live/live_map.ex)

> The Websocket is configured with `compress: true` (cf <https://hexdocs.pm/phoenix/Phoenix.Endpoint.html#socket/3-websocket-configuration>) to enable compression of the 1.1MB airport dataset through the LiveSocket.

Below a diagram showing the flow between the database, the server and the client.

```mermaid
sequenceDiagram
    participant Client
    participant LiveView
    participant Database

    Client->>LiveView: mount (connected)
    Client->>Client: check localStorage/Valtio
    alt cached data exists and valid
        Client->>LiveView: "cache-checked" (cached: true)
        LiveView->>Client: verify hash
    else no valid cache
        Client->>LiveView: "cache-checked" (cached: false)
        LiveView->>Database: fetch_airports()
        Database-->>LiveView: airports data
        LiveView->>Client: "airports" event with data
        Client->>Client: update localStorage + Valtio
    end
```

## Navigation

The user use "live navigation" when online between two pages which use the same _live_session_, with no full page reload.

When the user goes offline, we have the same smooth navigation thanks to navigation hijack an the HTML and assets caching, as well as the usage of `y-indexeddb`.

**Lifecycle**:

- Initial Load: App starts a continous server check. It determines if online/offline and sets up accordingly
- Going Offline: Triggers component initialization and navigation setup
- Navigating Offline: cleans up components, _fetch_ the cached pages (request proxied by the SW and the page are cached iva the `additionalManifestEntries`), parse ahd hydrate the DOM to renders components
- Going Online: when the polling detects a transistion off->on, the user expects a page refresh and Phoenix LiveView reinitializes.

**Key point**:

- ⚠️ **memory leaks**:
  With this offline navigation, we never refresh the page. As said before, reactive components and subscriptions need to be cleaned before disposal. We store the cleanup functions and the subscriptions.

## Vite

### Configuration and settings

All the client code is managed by `Vite` and done (mostly) in a declarative way in the file [vite.config.js](https://github.com/dwyl/PWA-Liveview/blob/main/assets/vite.config.js).

> Most declarations are done programatically as it is run by `NodeJS`.

#### Watcher

There is a watcher configured in "config/dev.exs" which replaces, thus removes, `esbuild` and `tailwindCSS` (which are also removed from the mix deps).

```elixir
watchers: [
    npx: [
      "vite",
      "build",
      "--mode",
      "development",
      "--watch",
      "--config",
      "vite.config.js",
      cd: Path.expand("../assets", __DIR__)
    ]
  ]
```

#### Tailwind

⚠️You can't use v4 but should _keep v3.4_. Indeed, Tailwind v4 drops the "tailwind.config.js" and there is no proper way to parse the SSR files (.ex, .heex) without it.

Tailwind is used as a PostCSS plugin. In the `Vite` config, it is set with the declaration:

```js
import tailwindcss from "tailwindcss";
[...]
// in `defineConfig`, add:
css: {
  postcss: {
    plugins: [tailwindcss()],
  },
},
```

and reads automatically the "tailwind.configjs" which sits next to "vite.config.js".

> Note. We use `lightningCSS` for further optimze the CSS and `autoprefixer` is built in (if "-weebkit" for flex/grid or "-moz" for transitions are needed).

#### Client Env

The env arguments are loaded with `loadEnv`.

1. Runtime access: `import.meta.env`
   The client env vars are set in the ".env" placed, placed in the "/assets" folder (origin client code) next to "vite.config.js".
   They need to be prefixed with `VITE_`.
   They is injected by `Vite` at _runtime_ when you use `import.meta.env`.
   In particular, we use `VITE_API_KEY` for `Maptiler` to render the vector tiles.

2. Compile access: `define`
   it is used at _compile time_ .
   The directive `define` is used to get _compile time_ global constant replacement. This is valuable for dead code elimination.
   For example:

   ```js
   define: {
     __API_ENDPOINT__: JSON.stringify(
       process.env.NODE_ENV === "production"
         ? "https://example.com"
         : "http://localhost:4000"
     );
   }
   [...]
   // NODE_ENV="prodution"
   // file.js
   if (__API__ENDPOINT__ !== "https://example.com") {
    // => dead code eliminated
   }
   ```

3. Docker:
   In the Docker build stage, you copy the "assets" folder.
   You therefor copy the ".env" file so the env vars variables are accessible at runtime.
   When you deploy, we need to set an env variable `VITE_API_KEY` which will be used to build the image.

### Static assets

We do not use the step `mix phx.digest` and removed from the Dockerfile.
We fingerprint and compress the static files via `Vite`.

```js
rollupOptions.output: {
  assetFileNames: "assets/[name]-[hash][extname]",
  chunkFileNames: "assets/[name]-[hash].js",
  entryFileNames: "assets/[name]-[hash].js",
},
```

We do this because we want the SW to be able to detect client code changes and update the app. The Phoenix work would interfer.

**Caveat**: versioned fils have dynamic so how to pass them to the "root.html.heex" component?

When assets are not fingerprinted, Phoenix can serve them "normally" as names are known:

```elixir
<link rel="icon" href="/favicon.ico" type="image/png" sizes="48x48" />
<link rel="manifest" href="/manifest.webmanifest" />
```

When the asset reference is versioned, we use the `.vte/manifest` dictionary to find the new name.
We used a helper [ViteHelper](https://github.com/dwyl/PWA-Liveview/blob/main/lib/soldiyjsweb/vite_helper.ex) to map the original name to the versioned one (the one in "priv/static/assets").

```elixir
<link
  phx-track-static
  rel="stylesheet"
  href={ViteHelper.path("css/app.css")}
  # href={~p"/assets/app.css"}
  crossorigin="anonymous"
/>

<script
  defer
  phx-track-static
  nonce={assigns[:main_nonce]}
  type="module"
  src={ViteHelper.path("js/main.js")}
  # src={~p"/app.css"}
  crossorigin="anonymous"
>
</script>
```

Not all assets need to be fingerprinted, such as "robotx.txt", icons.... To copy these files , we use the plugin `vite-plugin-static-copy`.

We also compress files to _ZSTD_ known for its compression performance and deflating speed. We use the plugin `vite-plugin-compression2` and use `@mongodb-js/zstd`.

We modify "endpoint.ex" to accept these encodings:

```elixir
plug Plug.Static,
  encodings: [{"zstd", ".zstd"}],
  brotli: true,
  gzip: true,
  at: "/",
  from: :liveview_pwa,
  only: ~w(
    assets
    icons
    robots.txt
    sw.js
    manifest.webmanifest
    sitemap.xml
    ),
  headers: %{
    "cache-control" => "public, max-age=31536000"
  }
  [...]
```

### VitePWA plugin and Workbox Caching Strategies

We use the [VitePWA](https://vite-pwa-org.netlify.app/guide/) plugin to generate the SW and the manifest.

The client code is loaded in a `<script>`. It will load the SW registration when the event DOMContentLoaded fires.
All of the hooks are loaded and attached to the LiveSocket, like an SPA.
If we don't _preload_ the JS files in the SW, most of the js files will never be cached, thus the app won't work offline.

For this, we define that we want to preload all static assets in the directive `globPattern`.

Once the SW activated, you should see (in dev mode):

<img width="548" alt="Screenshot 2025-02-26 at 16 56 40" src="https://github.com/user-attachments/assets/932c587c-908f-4e47-936a-7a191a35c892" />
<br/>

We also cache the rendered HTML pages as we inject them when offline, via `additionalManifestEntries`.

```js
PWAConfig = {
  // Don't inject <script> to register SW (handled manually)
  // and there no client generated "index.html" by Phoenix
  injectRegister: false, // no client generated "index.html" by Phoenix

  // Let Workbox auto-generate the service worker from config
  strategies: "generateSW",

  // App manually prompts user to update SW when available
  registerType: "prompt",

  // SW lifecycle ---
  // Claim control over all uncontrolled pages as soon as the SW is activated
  clientsClaim: true,

  // Let app decide when to update; user must confirm or app logic must apply update
  skipWaiting: false,

  workbox: {...}
}
```

❗️ It is important _not to split_ the "sw.js" file because `Vite` produces a fingerprint from the splitted files. However, Phoenix serves hardcoded nmes and can't know the name in advance.

```js
workbox: {
  // Disable to avoid interference with Phoenix LiveView WebSocket negotiation
  navigationPreload: false

  // ❗️ no fallback to "index.html" as it does not exist
  navigateFallback: null

  // ‼️ tell Workbox not to split te SW as the other is fingerprinted, thus unknown to Phoenix.
  inlineWorkboxRuntime: true,

  // preload all the built static assets
  globPatterns: ["assets/**/*.*"],

  // cached the HTML for offline rendering
  additionalManifestEntries: [
    { url: "/", revision: `${Date.now()}` }, // Manually precache root route
    { url: "/map", revision: `${Date.now()}` }, // Manually precache map route
  ],

}
```

For the Service Worker lifecycle, set:

```js
defineConfig = {
  // Disable default public dir (using Phoenix's)
  publicDir: false,
};
```

## Yjs and y_ex

[TODO something smart...]

## Misc

### Presence through Live-navigation

It is implemented using a `Channel` and a `JavaScript` snippet.

The reason is that if we implement it with "streams", it will wash away the current stream
used by `Phoenix_sync`.

It also allows to minimise rendering when navigation to the different Liveviews.

The relevant module is: `setPresenceChannel.js` whilst the list is a reactive JS component (`SolidJS`).
It returns a "dispose" and an update" function.

This snippet runs in "main.js".
The key points are:

- use `presence.onSync` to get the `Presence` list up-to-date
- use `phx:page-loading-stop` when navigating between Liveviews because we target DOM elements to render the reactive component.

### CSP rules and evaluation

The application implements security CSP headers set by a plug: `BrowserCSP`.

We mainly protect the "main.js" file - run as a script in the "root.html" template - is protected with a **dynamic nonce**.

<details>
<summary>Detail of dynamic nonce</summary>

```elixir
defmodule SoldiyjsWeb.BrowserCSP do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    nonce = :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
    Plug.Conn.assign(conn, :csp_nonce, nonce)
  end
end
```

````elixir
# root.html.heex
<script nonce="<%= assigns[:csp_nonce] %>">
  // Your inline script here
</script>

```elixir
defp put_csp_headers(conn) do
  nonce = conn.assigns[:csp_nonce] || ""

  csp_policy = """
  script-src 'self' 'nonce-#{nonce}' 'wasm-unsafe-eval' https://cdn.maptiler.com;
  object-src 'none';
  connect-src 'self' http://localhost:* ws://localhost:* https://api.maptiler.com https://*.maptiler.com;
  img-src 'self' data: https://*.maptiler.com https://api.maptiler.com;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  default-src 'self';
  frame-ancestors 'self' http://localhost:*;
  base-uri 'self'
  """
  |> String.replace("\n", " ")

  put_resp_header(conn, "content-security-policy", csp_policy)
end
````

</details>

The nonce-xxx attribute is an assign populated in the plug BrowserCSP.
Indeed, the "root" template is rendered on the first mount, and has access to the `conn.assigns`.

➡️ Link to check the endpoint: <https://csp-evaluator.withgoogle.com/>

<br/>
<img width="581" alt="Screenshot 2025-05-02 at 21 18 09" src="https://github.com/user-attachments/assets/f80d2c0e-0f2f-460c-bec6-e0b5ff884120" />
<br/>

The WASM module needs `'wasm-unsafe-eval'` as the browser runs `eval`.

### Icons

You will need is to have at least two very low resolution icons of size 192 and 512, one extra of 180 for OSX and one 62 for Microsoft, all placed in "/priv/static".

Check [Resources](#resources)

### Manifest

The "manifest.webmanifest" file will be generated from "vite.config.js".

Source: check [PWABuilder](https://www.pwabuilder.com)

```json
{
  "name": "LivePWA",
  "short_name": "LivePWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "lang": "en",
  "scope": "/",
  "description": "A Phoenix LiveView PWA demo app",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/images/icon-192.png", "sizes": "192x192", "type": "image/png" },
    ...
  ]
}
```

✅ Insert the links to the icons in the (root layout) HTML:

```html
<!-- root.html.heex -->
<head>
  [...] <link rel="icon-192" href={~p"/icons/icon-192.png"} /> <link
  rel="icon-512" href={~p"/icons/icon-512.png"} /> [...] <link rel="manifest"
  href={~p"/manifest.webmanifest"} /> [...]
</head>
```

## Performance

Lighthouse results:

<div align="center"><img width="619" alt="Screenshot 2024-12-28 at 04 45 26" src="https://github.com/user-attachments/assets/e6244e79-2d31-47df-9bce-a2d2a4984a33" /></div>

### [Optional] Page Caching

<details>
<summary>Direct usage of Cache API instead of Workbox</summary>

We can use the `Cache API` as an alternative to `Workbox` to cache pages. The important part is to calculate the "Content-Length" to be able to cache it.

> Note: we cache a page only once by using a `Set`

```javascript
// Cache current page if it's in the configured routes
async function addCurrentPageToCache({ current, routes }) {
  await navigator.serviceWorker.ready;
  const newPath = new URL(current).pathname;

  // Only cache configured routes once
  if (!routes.includes(newPath) || AppState.paths.has(newPath)) return;

  if (newPath === window.location.pathname) {
    AppState.paths.add(newPath);
    const htmlContent = document.documentElement.outerHTML;
    const contentLength = new TextEncoder().encode(htmlContent).length;

    const response = new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Length": contentLength,
      },
      status: 200,
    });

    const cache = await caches.open(CONFIG.CACHE_NAME);
    return cache.put(current, response);
  }
}

// Monitor navigation events
navigation.addEventListener("navigate", async ({ destination: { url } }) => {
  return addCurrentPageToCache({ current: url, routes: CONFIG.ROUTES });
});
```

</Details>
</br>

## Publish

The site <https://docs.pwabuilder.com/#/builder/android> helps to publish PWAs on Google Play, Ios and other plateforms.

## Fly volumes

In the "fly.toml", the settings for the volume are:

```toml
[env]
DATABASE_PATH = '/mnt/db/main.db'
MIX_ENV = 'prod'
PHX_HOST = 'solidyjs-lively-pine-4375.fly.dev'
PORT = '8080'

[[mounts]]
source = 'name'
destination = '/mnt/db'
```

This volume is made persistent through build with `source = 'name'`.
We set the Fly secret: `DATABASE_PATH=mnt/db/main.db`.

## Documentation source

- Update API: <https://docs.yjs.dev/api/document-updates#update-api>
- Event handler "on": <https://docs.yjs.dev/api/y.doc#event-handler>
- local persistence with IndexedDB: <https://docs.yjs.dev/getting-started/allowing-offline-editing>
- Transactions: <https://docs.yjs.dev/getting-started/working-with-shared-types#transactions>
- Map shared type: <https://docs.yjs.dev/api/shared-types/y.map>
- observer on shared type: <https://docs.yjs.dev/api/shared-types/y.map#api>

## Resources

Besides Phoenix LiveView:

- [Yex with Channel](https://github.com/satoren/y-phoenix-channel)
- [Yjs Documentation](https://docs.yjs.dev/)
- [Vite PWA Plugin Guide](https://vite-pwa-org.netlify.app/guide/)
- [MDN PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices)
- [PWA builder](https://www.pwabuilder.com/reportcard?site=https://solidyjs-lively-pine-4375.fly.dev/)
- [Favicon Generator](https://favicon.inbrowser.app/tools/favicon-generator) and <https://vite-pwa-org.netlify.app/assets-generator/#pwa-minimal-icons-requirements>
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula)

## License

[GNU License](LICENSE)

## Credits

[Satoren](https://github.com/satoren) for [Yex](https://github.com/satoren/y_ex)
