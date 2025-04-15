import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
    ROUTES: Object.freeze(["/", "/map"]),
    POLL_INTERVAL: 2_000,
    MAX_RETRY_ATTEMPTS: 3,
  },
  AppState = {
    status: "checking",
    isOnline: true,
    interval: null,
    globalYdoc: null,
    reconnectAttempts: 0,
    swRegistration: null,
  };

//---------------
// Check server reachability
export async function checkServer(retryCount = 0) {
  try {
    const response = await fetch("/connectivity", {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch (err) {
    console.log(
      `Connectivity check failed: ${
        err.name === "AbortError" ? "timeout" : err.message
      }`
    );
    return false;
  }
}

function updateConnectionStatusUI(status) {
  const statusIcon = document.getElementById("online-status");
  if (!statusIcon) return;
  statusIcon.src =
    status === "online" ? "/images/online.svg" : "/images/offline.svg";

  // Dispatch event that other components can listen for
  window.dispatchEvent(
    new CustomEvent("connection-status-change", {
      detail: { status },
    })
  );
}

async function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (AppState.interval) return;

  AppState.interval = setInterval(async () => {
    const wasOnline = AppState.isOnline;
    AppState.isOnline = await checkServer();
    const newStatus = AppState.isOnline ? "online" : "offline";

    // if (!AppState.isOnline && !wasOnline) {
    //   handleReconnection();
    // }

    if (AppState.isOnline !== wasOnline) {
      AppState.status = newStatus;
      updateConnectionStatusUI(newStatus);
      console.log(
        `Connection status changed: ${
          wasOnline ? "online->offline" : "offline->online"
        }`,
        "=============="
      );
      updateConnectionStatusUI(newStatus);
    }
  }, interval);
}

// async function handleReconnection() {
//   // Check if we need to reload for LiveView reconnection
//   const path = window.location.pathname;
//   if (CONFIG.ROUTES.includes(path)) {
//     // If we're on a LiveView route, try to reconnect
//     if (window.liveSocket && !window.liveSocket.isConnected()) {
//       console.log("Attempting LiveSocket reconnection...");
//       window.liveSocket.connect();
//     }
//   }
// }

window.addEventListener("beforeunload", () => {
  clearInterval(AppState.interval);
});

document.addEventListener("DOMContentLoaded", async () => {
  // clearInterval(AppState.interval);
  AppState.status = (await checkServer()) ? "online" : "offline";
  console.log("==========> DOMContentLoaded", AppState.status);
  updateConnectionStatusUI(AppState.status);
  if (!AppState.interval) {
    startPolling();
  }
});

//--------------

async function displayVMap() {
  console.log("Render Map-----");
  try {
    const { RenderVMap } = await import("./renderVMap.js");
    return RenderVMap();
  } catch (error) {
    console.error("Error rendering map:", error);
  }
}

async function displayVForm() {
  console.log("Render Form-----");
  try {
    const { RenderVForm } = await import("./renderVForm.js");
    return RenderVForm();
  } catch (err) {
    console.error("Error rendering form:", err);
  }
}

async function displayStock(ydoc) {
  console.log("Render Stock-----");
  try {
    const { SolidYComp } = await import("./SolidYComp.jsx");
    return SolidYComp({
      ydoc,
      userID: sessionStorage.getItem("userID"),
      max: sessionStorage.getItem("max"),
      el: document.getElementById("stock"),
    });
  } catch (error) {
    console.error("Error rendering stock:", error);
  }
}

//---------------
// Initialize the app
async function initApp(lineStatus) {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    AppState.globalYdoc = await initYdoc();

    const { configureTopbar } = await import("./configureTopbar.js");
    configureTopbar();

    console.log("initApp ", lineStatus);

    // Online mode
    if (lineStatus) {
      const { yHook } = await import("./yHook.js"),
        { MapVHook } = await import("./mapVHook.js"),
        { FormVHook } = await import("./formVHook.js"),
        { PwaHook } = await import("./pwaHook.js");

      return initLiveSocket({
        MapVHook,
        FormVHook,
        PwaHook,
        YHook: yHook(AppState.globalYdoc),
      });
    }

    // Offline mode
    console.log("initApp offline mode, loading components directly");
    return initOfflineComponents();
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initOfflineComponents() {
  const path = window.location.pathname;
  if (path === "/map") {
    displayVMap();
    displayVForm();
  } else if (path === "/") {
    displayStock(AppState.globalYdoc);
  }
}

async function initLiveSocket(hooks) {
  try {
    const { LiveSocket } = await import("phoenix_live_view");
    const { Socket } = await import("phoenix");
    const csrfToken = document
      .querySelector("meta[name='csrf-token']")
      .getAttribute("content");

    const liveSocket = new LiveSocket("/live", Socket, {
      longPollFallbackMs: 2000,
      params: { _csrf_token: csrfToken },
      hooks,
    });

    liveSocket.connect();
    window.liveSocket = liveSocket;

    liveSocket.getSocket()?.onOpen(() => {
      console.log("liveSocket connected", liveSocket?.socket.isConnected());
    });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return initOfflineComponents();
  }
}

// **************************************
(async () => {
  try {
    AppState.isOnline = await checkServer();

    await initApp(AppState.isOnline);
    AppState.isOnline
      ? (AppState.status = "online")
      : (AppState.status = "offline");

    updateConnectionStatusUI(AppState.status);
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();
// if ("serviceWorker" in navigator && AppState.isOnline) {
//   await addCurrentPageToCache({
//     current: window.location.href,
//     routes: CONFIG.ROUTES,
//   });
// }

//--------------
// Enable server log streaming to client. Disable with reloader.disableServerLogs()
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});

/*
// Rules for manual caching, replaced by Workbox
async function addCurrentPageToCache({ current, routes }) {
  await navigator.serviceWorker.ready;
  if (!("caches" in window)) return;

  const newPath = new URL(current).pathname;

  // we cache the two pages "/" and "/map", and only once.
  if (!routes.includes(newPath)) return;
  if (AppState.paths.has(newPath)) return;
  if (newPath !== window.location.pathname) return;

  // let Workbox know this page should be cached
  // by triggering a "pageshow" event which Workbox can listen for
  if (navigator.serviceWorker.controller) {
    console.log(
      "Service worker is active - letting it handle page caching for:",
      newPath
    );
    AppState.paths.add(newPath);
    // Let workbox handle it by not manually caching
    return;
  }

  // Fall back to manual caching only if Workbox isn't available
  const cache = await caches.open(CONFIG.CACHE_NAME);
  const htmlContent = document.documentElement.outerHTML;
  const contentLength = new TextEncoder().encode(htmlContent).length;
  const headers = new Headers({
    "Content-Type": "text/html",
    "Content-Length": contentLength,
  });

  const response = new Response(htmlContent, {
    headers: headers,
    status: 200,
    statusText: "OK",
  });

  try {
    await cache.put(current, response);
    AppState.paths.add(newPath);
    console.log("Page cached successfully:", newPath);
  } catch (error) {
    console.error("Error caching page:", error);
    return;
  }
}

// Monitor navigation events and cache the current page if in declared routes
navigation.addEventListener("navigate", async ({ destination: { url } }) => {
  console.log("navigate event:", url);
  return addCurrentPageToCache({ current: url, routes: CONFIG.ROUTES });
});
*/
