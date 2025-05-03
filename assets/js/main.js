// import "../css/app.css";
import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
  ROUTES: Object.freeze(["/", "/map"]),
  MAIN_CONTENT_SELECTOR: "#main-content",
  POLL_INTERVAL: 2_000,
  ON_ICON: "/assets/online.svg",
  OFF_ICON: "/assets/offline.svg",
};

window.AppState = window.AppState || {
  status: "checking",
  isOnline: true,
  interval: null,
  globalYdoc: null,
  lastSuccessfulConnection: Date.now(),
};

export { AppState };

const offlineComponents = {
  stock: null,
  map: null,
  form: null,
};

async function startApp() {
  console.log("App started");
  try {
    const { checkServer } = await import("@js/utilities/checkServer");
    const { default: initYdoc } = await import("@js/stores/initYJS.js");

    AppState.globalYdoc = await initYdoc();
    AppState.isOnline = await checkServer();
    AppState.status = AppState.isOnline ? "online" : "offline";

    updateConnectionStatus(AppState.isOnline);
    await init(AppState.isOnline);
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

startApp();

// Register service worker early ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const { registerServiceWorker } = await import(
    "@js/utilities/pwaRegistration"
  );
  return await registerServiceWorker();
});

// Polling for connection status ----------
function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (AppState.interval) return;

  console.log("start Polling______");

  AppState.interval = setInterval(async () => {
    const { checkServer } = await import("@js/utilities/checkServer");
    const isOnline = await checkServer();
    return updateConnectionStatus(isOnline);
  }, interval);

  return AppState.interval;
}

// Update connection status ----------------
function updateConnectionStatus(isOnline) {
  const wasOnline = AppState.isOnline;
  AppState.isOnline = isOnline;
  AppState.status = isOnline ? "online" : "offline";

  // Only update UI and log if status actually changed
  if (wasOnline !== isOnline) {
    const statusIcon = document.getElementById("online-status");
    if (!statusIcon) return;

    statusIcon.src =
      AppState.status === "online" ? CONFIG.ON_ICON : CONFIG.OFF_ICON;
    console.log(
      `Connection status: ${wasOnline ? "online->offline" : "offline->online"}`
    );
    document.dispatchEvent(
      new CustomEvent("connection-status-changed", {
        detail: { status: AppState.status },
      })
    );
  }
}

//---------------
// Initialize the hooks and components
async function init(lineStatus) {
  try {
    const { configureTopbar } = await import(
      "@js/utilities/configureTopbar.js"
    );
    configureTopbar();

    // Online mode
    if (lineStatus) {
      const { default: ydocSocket } = await import(
        "@js/ydoc_socket/ydocSocket"
      );

      const { StockYHook } = await import("@js/hooks/hookYStock.js"),
        { PwaFlash } = await import("@js/hooks/hookPwaFlash.js"),
        { MapHook } = await import("@js/hooks/hookMap.js"),
        { FormHook } = await import("@js/hooks/hookForm.js");

      // make the liveSocket globally available
      window.liveSocket = await initLiveSocket({
        MapHook,
        FormHook,
        PwaFlash,
        StockYHook: StockYHook({ ydoc: AppState.globalYdoc, ydocSocket }),
      });
      // offline mode
    } else {
      await initOfflineComponents();
    }
    return !AppState.interval && startPolling();
  } catch (error) {
    console.error("Init failed:", error);
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
      // longPollFallbackMs: 2000,
      params: { _csrf_token: csrfToken },
      hooks,
    });

    liveSocket.connect();
    // liveSocket.enableDebug();

    liveSocket.getSocket().onOpen(() => {
      console.log("liveSocket connected", liveSocket?.socket.isConnected());
      document.addEventListener("pwa-update-available", (e) => {
        console.log(
          "[PWA] update available event received",
          e.detail.updateAvailable
        );
        // [TODO]: send a flash
      });
      document.addEventListener("pwa-offline-ready", (e) => {
        console.log("[PWA] offline ready: ", e.detail.ready);
        window.dispatchEvent(
          new CustomEvent("pwa-ready", {
            detail: { ready: e.detail.ready },
          })
        );
        // [TODO]: send a flash
      });
      document.addEventListener("pwa-registration-error", (e) => {
        console.error(
          "[PWA] registration error event received",
          e.detail.error
        );
        window.dispatchEvent(
          new CustomEvent("pwa-error", {
            detail: { error: e.detail.error },
          })
        );
      });
    });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return initOfflineComponents();
  }
}

// old way, no need for cleanups as full page reload.....
// const offline_routes = {
//   "/": async () => {
//     const { displayStock } = await import("@js/components/renderers");
//     return await displayStock(AppState.globalYdoc);
//   },
//   "/map": async () => {
//     const { displayMap } = await import("@js/components/renderers");
//     const { displayForm } = await import("@js/components/renderers");
//     await displayForm();
//     await displayMap();
//     return;
//   },
// };

document.addEventListener("connection-status-changed", async (e) => {
  console.log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    console.log("Offline mode activated-----------");
    return await initOfflineComponents();
  } else if (e.detail.status === "online") {
    window.location.reload();
  }

  console.log("Online mode activated-----------");
  await cleanupOfflineComponents();
  // Let Phoenix LiveView take over again - you may need to reload or reconnect
  if (window.liveSocket) {
    return window.liveSocket.connect();
  }
});

async function initOfflineComponents() {
  if (AppState.isOnline) return;
  console.log("initOfflineComponents---------");
  await renderCurrentView();
  return attachNavigationListeners();
}

function attachNavigationListeners() {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleOfflineNavigation);
    link.addEventListener("click", handleOfflineNavigation);
  });
}

async function renderCurrentView() {
  await cleanupOfflineComponents();

  const el = document.getElementById("stock_y");
  if (el) {
    const { displayStock } = await import("@js/components/renderers");
    offlineComponents.stock = await displayStock({
      ydoc: AppState.globalYdoc,
      el,
    });
  }

  const elMap = document.getElementById("mapform");
  const elForm = document.getElementById("select_form");

  if (elMap && elForm) {
    const { displayMap, displayForm } = await import(
      "@js/components/renderers"
    );
    const mapResult = await displayMap();
    offlineComponents.map = mapResult;
    offlineComponents.form = await displayForm(elForm);
  }
  return;
}

async function cleanupOfflineComponents() {
  // Cleanup Stock SolidJS component
  if (offlineComponents.stock) {
    try {
      offlineComponents.stock();
    } catch (error) {
      console.error("Error cleaning up Stock component:", error);
    }
    offlineComponents.stock = null;
  }

  // Cleanup Leaflet map
  if (offlineComponents.map) {
    try {
      offlineComponents.map();
    } catch (error) {
      console.error("Error cleaning up Map component:", error);
    }
    offlineComponents.map = null;
  }

  // Cleanup Form SolidJS component
  if (offlineComponents.form) {
    try {
      offlineComponents.form();
    } catch (error) {
      console.error("Error cleaning up Form component:", error);
    }
    offlineComponents.form = null;
  }
}

/*
Clean up existing components (to prevent memory leaks)
Update the DOM structure with the cached HTML
Render the new components into the updated DOM
Reattach navigation listeners to handle future navigation
*/
async function handleOfflineNavigation(event) {
  try {
    event.preventDefault();
    const link = event.currentTarget;
    const path = link.getAttribute("data-path") || link.getAttribute("href");

    // Update URL without page reload
    window.history.pushState({ path }, "", path);

    // Try to get the page from cache via fetch
    const response = await fetch(path);
    if (!response.ok)
      throw new Error(`Failed to fetch ${path}: ${response.status}`);

    const html = await response.text();
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContent = doc.querySelector(CONFIG.MAIN_CONTENT_SELECTOR);
    if (!newContent)
      throw new Error(`Main content element not found in fetched HTML`);

    // Replace only the main content, not the entire body
    const currentContent = document.querySelector(CONFIG.MAIN_CONTENT_SELECTOR);
    if (currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
      await renderCurrentView();
      attachNavigationListeners();
    }
  } catch (error) {
    console.error("Offline navigation error:", error);
    return false;
  }
}

//
//--------------
// Enable server log streaming to client. Disable with reloader.disableServerLogs()
// window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
//   reloader.enableServerLogs();
//   // reloader.disableServerLogs();
//   window.liveReloader = reloader;
// });
