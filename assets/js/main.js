import "@css/app.css";
import { Presence } from "phoenix";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

const CONFIG = {
  POLL_INTERVAL: 10_000,
  ICONS: {
    online: new URL("/images/online.svg", import.meta.url).href,
    offline: new URL("/images/offline.svg", import.meta.url).href,
  },
  // navigate.js
  CONTENT_SELECTOR: "#main-content",
  NAVIDS: {
    yjs: { path: "/", id: "users-yjs" },
    map: { path: "/map", id: "users-map" },
    elec: { path: "/elec", id: "users-elec" },
  },
  PHX_HOOKS_IDS: {
    yjs_stock: "yjs-stock",
    map: "map",
    mapForm: "select-form",
  },
};

const AppState = {
  status: null,
  isOnline: true,
  interval: null,
  globalYdoc: null,
  userSocket: null,
  updateServiceWorker: null,
  userToken: null,
  userSocket: null,
};

// window.AppState = AppState; <- debugging only

export { AppState, CONFIG };

async function startApp() {
  console.log(" **** App started ****");
  try {
    const [
      { checkServer },
      { initYDoc },
      { setUserSocket },
      { setPresenceChannel },
      response,
    ] = await Promise.all([
      import("@js/utilities/checkServer"),
      import("@js/stores/initYJS"),
      import("@js/user_socket/userSocket"),
      import("@js/user_socket/setPresenceChannel"),
      fetch("/api/user_token", { cache: "no-store" }),
    ]);

    const { user_token } = await response.json();

    const [globalYdoc, isOnline, userSocket] = await Promise.all([
      initYDoc(),
      checkServer(),
      setUserSocket(user_token),
    ]);
    await setPresenceChannel(userSocket, "proxy:presence", user_token);

    Object.assign(AppState, {
      userToken: user_token,
      globalYdoc,
      isOnline,
      userSocket,
    });

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
  const [{ configureTopbar }, { registerServiceWorker }] = await Promise.all([
    import("@js/utilities/configureTopbar"),
    import("@js/utilities/pwaRegistration"),
  ]);

  const [_, swRegistration] = await Promise.all([
    configureTopbar(),
    registerServiceWorker(),
  ]);

  AppState.updateServiceWorker = swRegistration;
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
      AppState.status === "online" ? CONFIG.ICONS.online : CONFIG.ICONS.offline;
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
    window.liveSocket.connect();
    // window.location.reload();
  }
});

// Selectively start
async function init(isOnline) {
  // console.log("Start Init online? :", isOnline);
  try {
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
      // { setPresenceChannel },
      { StockElecHook },
      { StockJsonHook },
      { PwaHook },
      { MapHook },
      { FormHook },
      { LiveSocket },
      { Socket },
    ] = await Promise.all([
      // import("@js/user_socket/setPresenceChannel"),
      import("@js/hooks/hookElecStock"),
      import("@js/hooks/hookJsonStock.js"),
      import("@js/hooks/hookPwa.js"),
      import("@js/hooks/hookMap.js"),
      import("@js/hooks/hookForm.js"),
      import("phoenix_live_view"),
      import("phoenix"),
    ]);

    const csrfToken = document
      .querySelector("meta[name='csrf-token']")
      .getAttribute("content");

    const hooks = {
      StockJsonHook: StockJsonHook({
        ydoc: AppState.globalYdoc,
        userSocket: AppState.userSocket,
      }),
      MapHook,
      FormHook,
      PwaHook,
      StockElecHook,
    };

    const liveSocket = new LiveSocket("/live", Socket, {
      // longPollFallbackMs: 2000,
      params: { _csrf_token: csrfToken },
      hooks,
    });

    liveSocket.connect();
    // liveSocket.enableDebug();

    // liveSocket.getSocket().onOpen(async () => {
    // });
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
