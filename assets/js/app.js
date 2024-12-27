// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar.cjs";
import initYdoc from "./initYJS.js";

import { registerSW } from "virtual:pwa-register";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { solHook } from "./solHook.jsx";

let isOffline = false,
  ydoc = null,
  csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

export const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

registerRoute(
  ({ url }) => url.pathname.startsWith("/live/longpoll"),
  new NetworkFirst({
    cacheName: "long-poll-cache",
    networkTimeoutSeconds: 5,
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          // const cache = await caches.open("long-poll-cache");
          return (
            // cache.match(request) ||
            new Response(
              JSON.stringify({
                events: [],
                status: "ok",
                token: request.url.searchParams.get("token"),
              }),
              { headers: { "Content-Type": "application/json" } }
            )
          );
        },
      },
    ],
  })
);

// handle reconnection
window.addEventListener("online", () => {
  isOffline = false;
  navigator.serviceWorker.controller?.postMessage("socket-reconnected");
  window.location.reload();
});

// window.addEventListener("offline", () => {
//   if (isOffline) {
//     isOffline = true;
//     const container = document.getElementById("solid");
//     if (container && window.ydoc) {
//       window.SolidComp?.({
//         ydoc: window.ydoc,
//         user_id: localStorage.getItem("cached_user_id"),
//         el: container,
//       });
//     }
//   }
// });

// Caching HTML for Offline Use
registerRoute(
  ({ request }) => request.destination === "document",
  new StaleWhileRevalidate({
    cacheName: "html-cache",
  })
);

// Caching JavaScript and CSS
registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: "assets-cache",
  })
);

self.addEventListener("message", (event) => {
  if (event.data === "socket-reconnected") {
    isOffline = false;
  }
});

// handle navigation requests & handle longpoll requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/live/longpoll")) {
    event.respondWith(
      (async () => {
        if (isOffline) {
          // Return synthetic response for subsequent requests while offline
          return new Response(
            JSON.stringify({
              events: [],
              status: "ok",
              token: url.searchParams.get("token"),
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          const response = await fetch(event.request);
          if (!response.ok) {
            isOffline = true;
            throw new Error("Network response was not ok");
          }
          return response;
        } catch (error) {
          isOffline = true;
          // Return synthetic response for first failed request
          return new Response(
            JSON.stringify({
              events: [],
              status: "ok",
              token: url.searchParams.get("token"),
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
      })()
    );
    return;
  }

  // Handle other requests normally
  event.respondWith(fetch(event.request));
});

async function init() {
  ydoc = await initYdoc();
  const SolHook = solHook(ydoc);
  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 2500,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook },
  });
  liveSocket.connect();
  window.liveSocket = liveSocket;
  window.ydoc = ydoc;
  // if (isOffline) {
  //   console.log("SolidComp");
  //   const container = document.getElementById("solid");
  //   if (container) {
  //     return window.SolidComp({
  //       ydoc: window.ydoc,
  //       user_id: yodc.getMap("user").get("id"),
  //       el: container,
  //     });
  //   }
  // }
}

init();

import("./onlineStatus").then(({ statusListener }) => statusListener());

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (_info) => topbar.show(300));
window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());
