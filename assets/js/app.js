import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
    ROUTES: Object.freeze(["/", "/map"]),
    POLL_INTERVAL: 5000,
    CACHE_NAME: "lv-pages",
  },
  appState = {
    paths: new Set(),
    isOnline: false,
    interval: null,
  };

async function addCurrentPageToCache({ current, routes }) {
  await navigator.serviceWorker.ready;
  const newPath = new URL(current).pathname;

  if (!routes.includes(newPath)) return;
  // we cache the two pages "/"" and "/map" only once.
  if (appState.paths.has(newPath)) return;

  if (newPath === window.location.pathname) {
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
async function checkServer() {
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

function startPolling(interval = CONFIG.POLL_INTERVAL) {
  setInterval(async () => {
    const wasOnline = appState.isOnline;
    appState.isOnline = await checkServer();
    if (appState.isOnline !== wasOnline) {
      window.location.reload();
    }
  }, interval);
  console.log("Started polling...");
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing status monitoring...");
  appState.isOnline = await checkServer();
  updateOnlineStatusUI(appState.isOnline);

  // Start polling only if offline
  if (!appState.isOnline) {
    startPolling();
  }

  // Monitor online and offline events
  window.addEventListener("online", async () => window.location.reload());

  window.addEventListener("offline", () => {
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
    // window.ydoc = ydoc; // debug
    const { solHook } = await import("./solHook.js"),
      { mapHook } = await import("./mapHookOrigin.js"),
      { formHook } = await import("./formHook.js"),
      { PwaHook } = await import("./pwaHook.js"),
      { configureTopbar } = await import("./configureTopbar.js"),
      SolHook = solHook(ydoc),
      MapHook = mapHook(ydoc),
      FormHook = formHook(ydoc);

    configureTopbar();

    // Online mode
    if (lineStatus) {
      return initLiveSocket({ SolHook, MapHook, FormHook, PwaHook });
    }

    // Offline mode
    const path = window.location.pathname;

    if (path === "/map") {
      displayMap(ydoc);
      displayForm(ydoc);
    } else if (path === "/") {
      displayStock(ydoc);
    }
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initLiveSocket(hooks) {
  const { LiveSocket } = await import("phoenix_live_view");
  const { Socket } = await import("phoenix");
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 1000,
    params: { _csrf_token: csrfToken },
    hooks,
  });

  liveSocket.connect();
  window.liveSocket = liveSocket;

  liveSocket.getSocket().onOpen(() => {
    console.log("app liveSocket connected", liveSocket?.socket.isConnected());
  });
}

async function displayMap(ydoc) {
  console.log("Render Map-----");
  const { RenderMap } = await import("./mapHookOrigin.js");
  return RenderMap(ydoc);
}
async function displayForm(ydoc) {
  console.log("Render Form-----");
  const { RenderForm } = await import("./formHook.js");
  return RenderForm(ydoc);
}

async function displayStock(ydoc) {
  console.log("Render Stock-----");
  const { SolidComp } = await import("./SolidComp.jsx");

  return SolidComp({
    ydoc,
    userID: sessionStorage.getItem("userID"),
    max: sessionStorage.getItem("max"),
    el: document.getElementById("solid"),
  });
}

// **************************************
(async () => {
  appState.isOnline = await checkServer();
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

// Enable server log streaming to client. Disable with reloader.disableServerLogs()
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
