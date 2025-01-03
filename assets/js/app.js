import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();

const CONFIG = {
  ROUTES: Object.freeze(["/", "/map"]),
  POLL_INTERVAL: 5000,
  CACHE_NAME: "lv-pages",
};

const appState = {
  paths: new Set(),
  isOnline: false,
};

async function addCurrentPageToCache({ current, routes }) {
  await navigator.serviceWorker.ready;
  const newPath = new URL(current).pathname;

  if (!routes.includes(newPath)) return;
  // we cache the two pages "/"" and "/map" only once.
  if (appState.paths.has(newPath)) return;

  if (newPath === window.location.pathname) {
    console.log("addCurrentPageToCache", newPath);
    appState.paths.add(newPath);
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

    const cache = await caches.open("CONFIG.CACHE_NAME");
    return cache.put(current, response);
  } else return;
}

// Monitor navigation events and cache the current page if in declared routes
navigation.addEventListener("navigate", async ({ destination: { url } }) => {
  return addCurrentPageToCache({ current: url, routes: CONFIG.ROUTES });
});

//---------------
// Check server reachability
async function checkServerReachability() {
  try {
    const response = await fetch("/connectivity", { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error("Error checking server reachability:", error);
    return false;
  }
}

function updateOnlineStatusUI(online) {
  const statusElement = document.getElementById("online-status");
  if (statusElement) {
    statusElement.style.backgroundColor = online ? "lavender" : "tomato";
    statusElement.style.opacity = online ? "0.8" : "1";
    statusElement.textContent = online ? "Online" : "Offline";
  }
}

// && !appState.reloaded

function startPolling(interval = CONFIG.POLL_INTERVAL) {
  setInterval(async () => {
    const wasOnline = appState.isOnline;
    appState.isOnline = await checkServerReachability();
    if (appState.isOnline !== wasOnline) {
      // updateOnlineStatusUI(appState.isOnline);
      window.location.reload();
    }
  }, interval);
  console.log("Started polling...");
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing status monitoring...");
  appState.isOnline = await checkServerReachability();
  updateOnlineStatusUI(appState.isOnline);

  // Start polling only if offline
  if (!appState.isOnline) {
    startPolling();
  }

  // Monitor online and offline events
  window.addEventListener("online", async () => window.location.reload());

  window.addEventListener("offline", () => {
    console.log("Browser offline event fired");
    appState.isOnline = false;
    updateOnlineStatusUI(appState.isOnline);
    startPolling(); // Start polling when offline
  });
});

//--------------
async function initApp(lineStatus) {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use
    const { solHook } = await import("./solHook.jsx");
    const { MapHook } = await import("./mapHook.jsx");

    if (lineStatus) {
      const SolHook = solHook(ydoc); // setup SolidJS component
      return initLiveSocket({ SolHook, MapHook });
    }

    const path = window.location.pathname;

    if (path === "/map") {
      return displayMap();
    } else if (path === "/") {
      solHook(ydoc); // setup SolidJS component
      return displayStock();
    }
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initLiveSocket({ SolHook, MapHook }) {
  const { LiveSocket } = await import("phoenix_live_view");
  const { Socket } = await import("phoenix");
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 100,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook, MapHook },
  });

  liveSocket.connect();
  window.liveSocket = liveSocket;
  liveSocket.getSocket().onOpen(() => {
    console.log("Socket connected", liveSocket?.isConnected());
  });
  return true;
}

async function displayMap() {
  const { RenderMap } = await import("./mapHook.jsx");
  console.log("Render Map-----");
  return RenderMap();
}

async function displayStock() {
  try {
    if (!window.SolidComp || !window.ydoc) {
      console.error("Components not available", window.SolidComp, window.ydoc);
      return;
    }
    console.log("Render Stock-----");
    return window.SolidComp({
      ydoc: window.ydoc,
      userID: sessionStorage.getItem("userID"),
      max: sessionStorage.getItem("max"),
      el: document.getElementById("solid"),
    });
  } catch (error) {
    console.error("Error displaying component:", error);
  }
}

// **************************************
(async () => {
  console.log("~~~~~ Init ~~~~~");
  appState.isOnline = await checkServerReachability();
  await initApp(appState.isOnline);

  if ("serviceWorker" in navigator && appState.isOnline) {
    await addCurrentPageToCache({
      current: window.location.href,
      routes: CONFIG.ROUTES,
    });
  }
})();

//--------------
// Show progress bar on live navigation and form submits
await import("../vendor/topbar.cjs").then(configureTopbar);

async function configureTopbar({ default: topbar }) {
  topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
  window.addEventListener("phx:page-loading-start", (_info) => {
    topbar.show(300);
    document.body.style.cursor = "wait";
  });
  window.addEventListener("phx:page-loading-stop", (_info) => {
    document.body.style.cursor = "default";
    topbar.hide();
  });
}

// Enable server log streaming to client. Disable with reloader.disableServerLogs()
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
