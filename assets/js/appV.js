import "../css/app.css";

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
    ROUTES: Object.freeze(["/", "/map"]),
    POLL_INTERVAL: 2_000,
    CACHE_NAME: "lv-pages",
  },
  AppState = {
    paths: new Set(),
    status: "checking",
    isOnline: true,
    interval: null,
    globalYdoc: null,
  };

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
  // if (window.__WB_MANIFEST) {
  //   console.log("Letting Workbox handle page caching for:", newPath);
  //   AppState.paths.add(newPath);
  //   return;
  // }

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
  return addCurrentPageToCache({ current: url, routes: CONFIG.ROUTES });
});

//---------------
// Check server reachability
async function checkServer() {
  try {
    const response = await fetch("/connectivity", { method: "HEAD" });
    const isOk = response.ok;
    console.log("Server check result:", isOk);
    return isOk;
  } catch (error) {
    console.log("Server unreachable:", error);
    return false;
  }
}

function updateConnectionStatusUI(status) {
  document.getElementById("online-status").src =
    status === "online" ? "/images/online.svg" : "/images/offline.svg";
}

async function startPolling(status, interval = CONFIG.POLL_INTERVAL) {
  clearInterval(AppState.interval);
  AppState.interval = setInterval(async () => {
    const wasOnline = AppState.isOnline;
    AppState.isOnline = await checkServer();

    if (AppState.isOnline !== wasOnline) {
      console.log(
        `Connection status changed: ${
          wasOnline ? "online->offline" : "offline->online"
        }`
      );
      updateConnectionStatusUI(AppState.isOnline ? "online" : "offline");
    }

    if (AppState.isOnline && status === "offline") {
      window.location.reload();
    }
  }, interval);
}

document.addEventListener("DOMContentLoaded", async () => {
  AppState.status = (await checkServer()) ? "online" : "offline";
  console.log("DOMContentLoaded", AppState.status);
  updateConnectionStatusUI(AppState.status);
  // Always start polling to detect status changes
  startPolling(AppState.status);

  // Monitor online and offline events
  window.addEventListener("online", () => {
    console.log("to online");
    AppState.isOnline = true;
    AppState.status = "online";
    updateConnectionStatusUI("online");
    // window.location.reload();
  });

  window.addEventListener("offline", async () => {
    console.log("to offline");
    AppState.isOnline = false;
    AppState.status = "offline";
    updateConnectionStatusUI("offline");
    return startPolling(AppState.status); // Start polling when offline
  });
});

//--------------

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

//---------------
// Initialize the app
async function initApp(lineStatus) {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    AppState.globalYdoc = await initYdoc();
    const { yHook } = await import("./yHook.js"),
      { MapVHook } = await import("./mapVHook.js"),
      { FormVHook } = await import("./formVHook.js"),
      { configureTopbar } = await import("./configureTopbar.js"),
      { PwaHook } = await import("./pwaHook.js");

    configureTopbar();

    // Online mode
    if (lineStatus) {
      return initLiveSocket({
        MapVHook,
        FormVHook,
        PwaHook,
        YHook: yHook(AppState.globalYdoc),
      });
    }

    // Offline mode
    initOfflineComponents();
  } catch (error) {
    console.error("Init failed:", error);
  }
}

function initOfflineComponents() {
  const path = window.location.pathname;

  if (path === "/map") {
    displayVMap();
    displayVForm();
  } else if (path === "/") {
    displayStock(AppState.globalYdoc);
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

// **************************************
(async () => {
  try {
    AppState.isOnline = await checkServer();

    await initApp(AppState.isOnline);

    window.addEventListener("phx:page-loading-stop", () => {
      if (!window.liveSocket?.isConnected()) {
        console.log("liveSocket not connected");
        window.liveSocket.connect();
      }
    });

    if ("serviceWorker" in navigator && AppState.isOnline) {
      await addCurrentPageToCache({
        current: window.location.href,
        routes: CONFIG.ROUTES,
      });
    }

    window.addEventListener("offline", () => {
      console.warn("Application going offline");
    });

    window.addEventListener("online", () => {
      console.log("Application back online");
      window.location.reload();
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();

//--------------
// Show progress bar on live navigation and form submits

// Enable server log streaming to client. Disable with reloader.disableServerLogs()
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
