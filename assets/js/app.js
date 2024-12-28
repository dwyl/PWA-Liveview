// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();

let isOffline = false;

self.addEventListener("message------", (event) => {
  console.log("message", event);
  if (event.data === "socket-reconnected") {
    isOffline = false;
  }
});

const onlineStatusHandlers = {
  // handle reconnection
  online: () => {
    isOffline = false;
    navigator.serviceWorker.controller?.postMessage("socket-reconnected");
    window.location.reload();
  },
  offline: () => {
    isOffline = true;
  },
};

window.addEventListener("online", onlineStatusHandlers.online);
window.addEventListener("offline", onlineStatusHandlers.offline);

async function initApp() {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use

    const { solHook } = await import("./solHook.jsx");
    const SolHook = solHook(ydoc);

    // Only try to setup LiveSocket if we're online
    if (navigator.onLine && !isOffline) {
      await initLiveSocket(SolHook);
    }

    // Always try to display the component in offline mode
    if (!navigator.onLine || isOffline) {
      await displayComponent();
    }
  } catch (error) {
    console.error("Init failed:", error);
    // If init fails, try to display offline component
    if (!navigator.onLine || isOffline) {
      await displayComponent();
    }
  }
}

async function initLiveSocket(SolHook) {
  const { LiveSocket } = await import("phoenix_live_view");
  const { Socket } = await import("phoenix");
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 5,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook },
  });

  liveSocket.connect();
  window.liveSocket = liveSocket;
}

async function displayComponent() {
  try {
    if (!window.SolidComp || !window.ydoc) {
      console.error("Components not available");
      return;
    }

    const container = document.getElementById("solid");
    if (!container) {
      console.error("Solid container not found");
      return;
    }

    return window.SolidComp({
      ydoc: window.ydoc,
      userID: sessionStorage.getItem("userID"),
      max: sessionStorage.getItem("max"),
      el: container,
    });
  } catch (error) {
    console.error("Error displaying component:", error);
  }
}

await initApp();

// Show online/offline status
import("./onlineStatus").then(({ statusListener }) => statusListener());
// Show progress bar on live navigation and form submits
import("../vendor/topbar.cjs").then(configureTopbar);

function configureTopbar({ default: topbar }) {
  topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
  window.addEventListener("phx:page-loading-start", (_info) =>
    topbar.show(300)
  );
  window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());
}

window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  // Enable server log streaming to client.
  // Disable with reloader.disableServerLogs()
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});

// handle navigation requests & handle longpoll requests
// self.addEventListener("fetch", (event) => {
//   const url = new URL(event.request.url);

//   if (url.pathname.startsWith("/live/longpoll")) {
//     event.respondWith(
//       (async () => {
//         if (isOffline) {
//           // Return synthetic response for subsequent requests while offline
//           return new Response(
//             JSON.stringify({
//               events: [],
//               status: "ok",
//               token: url.searchParams.get("token"),
//             }),
//             { headers: { "Content-Type": "application/json" } }
//           );
//         }

//         try {
//           const response = await fetch(event.request);
//           if (!response.ok) {
//             isOffline = true;
//             throw new Error("Network response was not ok");
//           }
//           return response;
//         } catch (error) {
//           isOffline = true;
//           // Return synthetic response for first failed request
//           return new Response(
//             JSON.stringify({
//               events: [],
//               status: "ok",
//               token: url.searchParams.get("token"),
//             }),
//             { headers: { "Content-Type": "application/json" } }
//           );
//         }
//       })()
//     );
//     return;
//   }

//   // Handle other requests normally
//   event.respondWith(fetch(event.request));
// });
// const ydoc = await initYdoc();
// const SolHook = solHook(ydoc);

// const liveSocket = new LiveSocket("/live", Socket, {
//   longPollFallbackMs: 2500,
//   params: { _csrf_token: csrfToken },
//   hooks: { SolHook },
// });
// liveSocket.connect();
// window.liveSocket = liveSocket;
// window.ydoc = ydoc;

// if (isOffline) {
//   await displayComponent();
// }

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
