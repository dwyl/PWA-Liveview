import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
  MAIN_CONTENT_SELECTOR: "#main-content", // used in navigate.js
  POLL_INTERVAL: 10_000,
  ON_ICON: new URL("/images/online.svg", import.meta.url).href,
  OFF_ICON: new URL("/images/offline.svg", import.meta.url).href,
};

const AppState = {
  status: null,
  isOnline: true,
  interval: null,
  globalYdoc: null,
  ydocSocket: null,
  updateServiceWorker: null,
};

// window.AppState = AppState; <- debugging only

export { AppState, CONFIG };

async function startApp() {
  console.log(" **** App started ****");
  try {
    const { checkServer } = await import("@js/utilities/checkServer");
    const { initYDoc } = await import("@js/stores/initYJS");

    AppState.globalYdoc = await initYDoc();
    AppState.isOnline = await checkServer();
    AppState.status = AppState.isOnline ? "online" : "offline";

    return await init(AppState.isOnline);
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// we start the polling heartbeat when the app is loaded
startApp().then(() => {
  !AppState.interval && startPolling();
});

// Register service worker early ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const { registerServiceWorker } = await import(
    "@js/utilities/pwaRegistration"
  );
  AppState.updateServiceWorker = await registerServiceWorker();
  return true;
});

// Polling ----------
function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (AppState.interval) return;

  AppState.interval = setInterval(async () => {
    const { checkServer } = await import("@js/utilities/checkServer");
    const isOnline = await checkServer();
    return updateConnectionStatus(isOnline);
  }, interval);

  return AppState.interval;
}

// Update connection status ----------------
function updateConnectionStatus(isOnline) {
  const prevStatus = AppState.status;
  AppState.status = isOnline ? "online" : "offline";
  AppState.isOnline = isOnline;

  // Only update UI and log if status actually changed
  if (prevStatus !== AppState.status) {
    const statusIcon = document.getElementById("online-status");
    statusIcon.src =
      AppState.status === "online" ? CONFIG.ON_ICON : CONFIG.OFF_ICON;
    window.dispatchEvent(
      new CustomEvent("connection-status-changed", {
        detail: { status: AppState.status },
      })
    );
  }
}

// trigger offline rendering if offline ---------------
window.addEventListener("connection-status-changed", async (e) => {
  console.log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    return initOfflineComponents();
  } else {
    window.location.reload();
  }
});

// Selectively start
async function init(isOnline) {
  console.log("Start Init online? :", isOnline);
  try {
    const { configureTopbar } = await import("@js/utilities/configureTopbar");
    configureTopbar();

    if (isOnline) {
      window.liveSocket = await initLiveSocket();
    } else {
      await initOfflineComponents();
    }
    return true;
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initLiveSocket() {
  try {
    const [
      { ydocSocket },
      { StockYHook },
      { PwaHook },
      { MapHook },
      { FormHook },
      { LiveSocket },
      { Socket },
    ] = await Promise.all([
      import("@js/ydoc_socket/ydocSocket"),
      import("@js/hooks/hookYStock.js"),
      import("@js/hooks/hookPwa.js"),
      import("@js/hooks/hookMap.js"),
      import("@js/hooks/hookForm.js"),
      import("phoenix_live_view"),
      import("phoenix"),
    ]);

    // custom websocket for the Yjs document channel transfer
    AppState.ydocSocket = ydocSocket;

    const csrfToken = document
      .querySelector("meta[name='csrf-token']")
      .getAttribute("content");

    const hooks = {
      StockYHook: StockYHook({
        ydoc: AppState.globalYdoc,
        ydocSocket: AppState.ydocSocket,
      }),
      MapHook,
      FormHook,
      PwaHook,
    };

    const liveSocket = new LiveSocket("/live", Socket, {
      // longPollFallbackMs: 2000,
      params: { _csrf_token: csrfToken },
      hooks,
    });

    liveSocket.connect();
    // liveSocket.enableDebug();

    liveSocket.getSocket().onOpen(async () => {
      console.log(
        "Is the LiveSocket connected ? ",
        liveSocket?.socket.isConnected()
      );
    });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return await initOfflineComponents();
  }
}

async function initOfflineComponents() {
  if (AppState.isOnline) return;
  console.log("Init Offline Components---------");
  const { renderCurrentView, attachNavigationListeners } = await import(
    "@js/utilities/navigate"
  );
  // first hijack the navigation to avoid the page reload
  attachNavigationListeners();
  // and then render the current view
  return await renderCurrentView();
}
