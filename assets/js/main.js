import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

import { appState, setAppState } from "@js/stores/AppStore.js";

const CONFIG = {
  POLL_INTERVAL: 1_000,
  ICONS: {
    online: new URL("@assets/online.svg", import.meta.url).href,
    offline: new URL("@assets/offline.svg", import.meta.url).href,
  },
  NAVIDS: {
    yjs: { path: "/yjs", id: "users-yjs" },
    map: { path: "/map", id: "users-map" },
    elec: { path: "/", id: "users-elec" },
  },
  CONTENT_SELECTOR: "#main-content",
  MapID: "hook-map",
  hooks: {
    PgStockHook: "hook-pg",
    StockYjsChHook: "hook-yjs-sql3",
    MapHook: "hook-map",
    FormHook: "hook-select-form",
  },
};

export { CONFIG };

// NOTE: pwaRegistry is a plain object so we can store callable functions
// without SolidJS proxy interference.
export const pwaRegistry = {};

const log = console.log;
//<- debugging only
window.appState = appState;
// window.pwaRegistry = pwaRegistry;

async function startApp() {
  log(" **** App started ****");
  try {
    const [
      { checkServer },
      { initYDoc },
      { setUserSocket },
      { setPresence },
      response,
    ] = await Promise.all([
      import("@js/utilities/checkServer"),
      import("@js/stores/initYJS"),
      import("@js/user_socket/userSocket"),
      import("@js/components/setPresence"),
      fetch("/api/user_token", { cache: "no-store" }),
    ]);

    const { user_token } = await response.json();

    const [globalYdoc, isOnline, userSocket] = await Promise.all([
      initYDoc(),
      checkServer(),
      setUserSocket(user_token),
    ]);
    await setPresence(userSocket, "proxy:presence", user_token);

    setAppState({
      userToken: user_token,
      globalYdoc,
      isOnline,
      userSocket,
      status: isOnline ? "online" : "offline",
    });

    return (window.liveSocket = await initLiveSocket());
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// we start the polling heartbeat when the app is loaded
startApp().then(() => {
  return !appState.interval && startPolling();
});

// Polling ----------
function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (appState.interval) return;

  setAppState(
    "interval",
    setInterval(async () => {
      const { checkServer } = await import("@js/utilities/checkServer");
      const isOnline = await checkServer();
      return updateConnectionStatus(isOnline);
    }, interval)
  );

  return appState.interval;
}

// Update connection status ----------------
function updateConnectionStatus(isOnline) {
  const prevStatus = appState.status;
  setAppState("isOnline", isOnline);
  setAppState("status", isOnline ? "online" : "offline");

  // Only update UI and log if status actually changed
  if (prevStatus !== appState.status) {
    const statusIcon = document.getElementById("online-status");
    statusIcon.src =
      appState.status === "online" ? CONFIG.ICONS.online : CONFIG.ICONS.offline;

    window.dispatchEvent(
      new CustomEvent("connection-status-changed", {
        detail: { status: appState.status },
      })
    );
  }
}

async function initLiveSocket() {
  try {
    const [
      { PgStockHook },
      { StockYjsChHook },
      { PwaHook },
      { MapHook },
      { FormHook },
      { LiveSocket },
      { Socket },
    ] = await Promise.all([
      import("@js/hooks/hookPgStock"),
      import("@js/hooks/hookYjsChStock.js"),
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
      StockYjsChHook: StockYjsChHook({
        ydoc: appState.globalYdoc,
        userSocket: appState.userSocket,
      }),
      PgStockHook: PgStockHook({
        ydoc: appState.globalYdoc,
        userSocket: appState.userSocket,
      }),
      MapHook: MapHook({ mapID: CONFIG.MapID }),
      FormHook,
      PwaHook,
    };
    setAppState("hooks", hooks);

    const liveSocket = new LiveSocket("/live", Socket, {
      longPollFallbackMs: 1000,
      params: { _csrf_token: csrfToken },
      hooks,
    });

    liveSocket.connect();
    // liveSocket.getSocket().onOpen(async () => {
    // });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return await initOfflineComponents();
  }
}

async function initOfflineComponents() {
  if (appState.isOnline) return;
  log("Init Offline Components---------");
  const {
    cleanExistingHooks,
    mountOfflineComponents,
    attachNavigationListeners,
  } = await import("@js/utilities/navigate");
  cleanExistingHooks();
  attachNavigationListeners();
  // and then render the current view
  const _module = await mountOfflineComponents();
  window.liveSocket.disconnect();
}

// Register service worker early ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const [{ configureTopbar }, { registerServiceWorker }] = await Promise.all([
    import("@js/utilities/configureTopbar"),
    import("@js/utilities/pwaRegistration"),
    // import("ua-parser-js"),
  ]);

  await Promise.all([configureTopbar(), registerServiceWorker()]);
  await maybeProposeAndroidInstall();
  // await maybeProposeAndroidInstall(new UAParser());
});

async function maybeProposeAndroidInstall() {
  const installButton = document.getElementById("install-button");
  if (installButton.dataset.os.toLowerCase() !== "android") {
    log("Not Android---");
    return;
  }

  // const result = parser.getResult();

  // if (result.os.name === "Android") {
  const { installAndroid } = await import("@js/utilities/installAndroidButton");
  installButton.classList.remove("hidden");
  installButton.classList.add("flex");

  return installAndroid(installButton);
  // } else {
  //   console.log("[UAParser] Not Android, no install button");
  // }
}

// trigger offline rendering if offline ---------------
window.addEventListener("connection-status-changed", async (e) => {
  log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    setAppState("status", "offline");
    return await initOfflineComponents();
  } else {
    log("what else??");
    window.location.reload();
  }
});
