// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { registerSW } from "virtual:pwa-register";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

let isOffline = false;

const csrfToken = document
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

// self.addEventListener("message", (event) => {
//   console.log(`[Message] event: `, event.data.type);
// });

// handle reconnection
window.addEventListener("online", () => {
  isOffline = false;
  navigator.serviceWorker.controller?.postMessage("socket-reconnected");
  window.location.reload();
});

window.addEventListener("offline", () => {
  isOffline = true;
  // if (!navigator.onLine || isOffline) {
  //   console.log("SolidComp");
  //   console.log(ydoc.getMap("user").get("id"));
  //   const container = document.getElementById("solid");
  //   if (container) {
  //     return window.SolidComp({
  //       ydoc: window.ydoc,
  //       user_id: ydoc.getMap("user").get("id"),
  //       el: container,
  //     });
  //   }
  // }
});

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
  const { default: initYdoc } = await import("./initYJS.js");
  const ydoc = await initYdoc();

  const { solHook } = await import("./solHook.jsx");
  const SolHook = solHook(ydoc);

  const { LiveSocket } = await import("phoenix_live_view");
  const { Socket } = await import("phoenix");
  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 2500,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook },
  });
  liveSocket.connect();
  window.liveSocket = liveSocket;
  window.ydoc = ydoc;

  // starts with longpoll
  // liveSocket.getSocket().onOpen(async () => {
  //   try {
  //     const url = new URL(window.location.href);
  //     url.searchParams.set("bypass_service_worker", Date.now().toString());

  //     const response = await fetch(url);
  //     console.log("response", response);
  //     if (response.redirected) {
  //       window.location.replace(response.url);
  //     }
  //   } catch (error) {
  //     console.error(
  //       "Error while checking for redirection on LiveView socket connection.",
  //       error
  //     );
  //   }
  // });

  if (!navigator.onLine || isOffline) {
    displayComponent();
  }
}

function displayComponent() {
  const container = document.getElementById("solid");
  if (container) {
    return window.SolidComp({
      ydoc: window.ydoc,
      userID: localStorage.getItem("userID"),
      el: container,
    });
  }
}

init();

// Show online/offline status
import("./onlineStatus").then(({ statusListener }) => statusListener());

// Show progress bar on live navigation and form submits
import("../vendor/topbar.cjs").then(({ default: topbar }) => {
  topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
  window.addEventListener("phx:page-loading-start", (_info) =>
    topbar.show(300)
  );
  window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());
});

window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  // Enable server log streaming to client.
  // Disable with reloader.disableServerLogs()
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
