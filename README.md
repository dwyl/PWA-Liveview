# ExLvYjsPWA

An Elixir-LiveView demo webapp to demonstrate how to make a real-time collaborative app with offline support (PWA).

Ingredients are:

- `Phoenix LiveView`
- `Yjs` & `y-indexeddb`
- `Vite-plugin-PWA`
- `SolidJS`

__Why `Vite` and not Esbuild__ ?

For developing the app, `Esbuild` is comfortable and perfect.

However, unless you are very experienced with `Workbox`, when you want to setup a Servce Worker, it is safer to optin for `Vite`.

This second point is valid for any LieView webapp. You should use dynamic imports for code splitting. `Vite` can use `Rollup`  to build so you can take advantage of its code splitting performance. This means that instead of loading a big chunk of 100kB or more, you end up with loading several JS files. For example here, the biggest is `Phoenix` (30kB gzip). This is important for the first rendering, and since you are doing SSR, you would degrade the first rendering performance.

## Guide

<https://vite-pwa-org.netlify.app/guide/>

### Offline Support

YJS's IndexedDB persistence handles offline support automatically.

When offline:

- Users can still modify the stock locally
- Changes are stored in IndexedDB
- When back online, YJS will sync changes

### Synchronization Flow

- User A changes stock → YJS update → Hook observes → LiveView broadcast
- LiveView broadcasts to all users → Hook receives "new_stock" → YJS update
- YJS update → All components observe change → UI updates


### Screenshots of what you should obtain

* Chrome browser menu: the manifest file, the Service Worker, the Cache storage, the IndexedDB database:
br/>
<img width="282" alt="Screenshot 2024-12-28 at 19 26 09" src="https://github.com/user-attachments/assets/33b5ca41-0dfb-4594-8e63-793741fcd175" />

* Memory used for the Service Worker `Cache`, `IndexedDB` with `y-indexedb`
<br/>
<img width="474" alt="Screenshot 2024-12-28 at 19 25 38" src="https://github.com/user-attachments/assets/3b9fe308-f790-42f3-9d1a-6acccfce5606" />

* Installed PWA
  <br/>
<img width="323" alt="Screenshot 2024-12-28 at 12 45 10" src="https://github.com/user-attachments/assets/c13ae6d3-64e1-4126-abb8-ad1fdbb1e622" />



<img width="619" alt="Screenshot 2024-12-28 at 04 45 26" src="https://github.com/user-attachments/assets/e6244e79-2d31-47df-9bce-a2d2a4984a33" />



