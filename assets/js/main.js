// import "../css/app.css";
import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
  MAIN_CONTENT_SELECTOR: "#main-content",
  POLL_INTERVAL: 5_000,
  ON_ICON: "/assets/online.svg",
  OFF_ICON: "/assets/offline.svg",
};

window.AppState = window.AppState || {
  status: "checking",
  isOnline: true,
  interval: null,
  globalYdoc: null,
};

export { AppState, CONFIG };

async function startApp() {
  console.log("App started");
  try {
    const { checkServer } = await import("@js/utilities/checkServer");
    const { default: initYdoc } = await import("@js/stores/initYJS.js");

    AppState.globalYdoc = await initYdoc();
    AppState.isOnline = await checkServer();
    AppState.status = AppState.isOnline ? "online" : "offline";

    updateConnectionStatus(AppState.isOnline);
    return await init(AppState.isOnline);
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
      setPwaListeners();
    });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return initOfflineComponents();
  }
}

function setPwaListeners() {
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
  });
  document.addEventListener("pwa-registration-error", (e) => {
    console.error("[PWA] registration error event received", e.detail.error);
    window.dispatchEvent(
      new CustomEvent("pwa-error", {
        detail: { error: e.detail.error },
      })
    );
  });
}

document.addEventListener("connection-status-changed", async (e) => {
  console.log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    return await initOfflineComponents();
  } else if (e.detail.status === "online") {
    window.location.reload();
  }
});

async function initOfflineComponents() {
  if (AppState.isOnline) return;
  console.log("initOfflineComponents---------");
  const { renderCurrentView, attachNavigationListeners } = await import(
    "@js/utilities/navigate"
  );
  await renderCurrentView();
  return attachNavigationListeners();
}
