import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
    ROUTES: Object.freeze(["/", "/map"]),
    POLL_INTERVAL: 10_000,
    CACHE_NAME: "lv-pages",
  },
  appState = {
    paths: new Set(),
    status: "checking",

    isOnline: true,
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

    const cache = await caches.open(CONFIG.CACHE_NAME);
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
    // console.error("Error checking server reachability:", error);
    return false;
  }
}

function updateConnectionStatusUI(status) {
  document.getElementById("online-status").src =
    status === "online" ? "/images/online.svg" : "/images/offline.svg";
}

function startPolling(status, interval = CONFIG.POLL_INTERVAL) {
  clearInterval(appState.interval);
  appState.interval = setInterval(async () => {
    appState.isOnline = await checkServer();
    if (appState.isOnline && status === "offline") {
      window.location.reload();
    }
  }, interval);
}

document.addEventListener("DOMContentLoaded", async () => {
  appState.status = (await checkServer()) ? "online" : "offline";
  updateConnectionStatusUI(appState.status);
  // Start polling only if offline
  if (appState.status === "offline") {
    startPolling(appState.status);
  }

  // Monitor online and offline events
  window.addEventListener("online", () => {
    appState.isOnline = true;
    appState.status = "online";
    updateConnectionStatusUI("online");
    // window.location.reload();
  });

  window.addEventListener("offline", () => {
    appState.isOnline = false;
    appState.status = "offline";
    updateConnectionStatusUI("offline");
    startPolling(appState.status); // Start polling when offline
  });
});

//--------------
async function initApp(lineStatus) {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    const { yHook } = await import("./yHook.js"),
      { MapVHook } = await import("./mapVHook.js"),
      { FormVHook } = await import("./formVHook.js"),
      { configureTopbar } = await import("./configureTopbar.js"),
      { PwaHook } = await import("./pwaHook.js");

    const YHook = yHook(ydoc);
    configureTopbar();

    // Online mode
    if (lineStatus) {
      return initLiveSocket({ MapVHook, FormVHook, PwaHook, YHook });
    }

    // Offline mode
    const path = window.location.pathname;
    if (path === "/map") {
      displayVMap();
      displayVForm();
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
    longPollFallbackMs: 2000,
    params: { _csrf_token: csrfToken },
    hooks,
  });

  liveSocket.connect();
  window.liveSocket = liveSocket;

  liveSocket.getSocket()?.onOpen(() => {
    console.log("liveSocket connected", liveSocket?.socket.isConnected());
  });
}

async function displayVMap() {
  console.log("Render Map-----");
  const { RenderVMap } = await import("./renderVMap.js");
  return RenderVMap();
}

async function displayVForm() {
  console.log("Render Form-----");
  const { RenderVForm } = await import("./renderVForm.js");
  return RenderVForm();
}

async function displayStock(ydoc) {
  console.log("Render Stock-----");
  const { SolidYComp } = await import("./SolidYComp.jsx");
  return SolidYComp({
    ydoc,
    userID: sessionStorage.getItem("userID"),
    max: sessionStorage.getItem("max"),
    el: document.getElementById("stock"),
  });
}

// **************************************
(async () => {
  appState.isOnline = await checkServer();
  await initApp(appState.isOnline);
  window.addEventListener("phx:page-loading-stop", () => {
    if (!window.liveSocket?.isConnected()) {
      console.log("liveSocket not connected");
      window.liveSocket.connect();
    }
  });

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
