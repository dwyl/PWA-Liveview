import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

import { appState, setAppState } from "@js/stores/AppStore.js";
import { checkServer } from "@js/utilities/checkServer.js";

export const CONFIG = {
  POLL_INTERVAL: 1_000,
  ICONS: {
    online: new URL("@assets/online.svg", import.meta.url).href,
    offline: new URL("@assets/offline.svg", import.meta.url).href,
  },
  NAVIDS: {
    yjs: { path: "/yjs", id: "users-yjs" },
    map: { path: "/map", id: "users-map" },
    elec: { path: "/sync", id: "users-elec" },
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

// NOTE: pwaRegistry is a plain object so we can store callable functions
// without SolidJS proxy interference.
export const pwaRegistry = {};

const log = console.log;

//<- debugging only
window.appState = appState;
// window.pwaRegistry = pwaRegistry;

function readCSRFToken() {
  const csrfTokenEl = document.querySelector("meta[name='csrf-token']");
  if (!csrfTokenEl) {
    throw new Error("CSRF token not found in meta tag");
  }
  return csrfTokenEl.content;
}

//  ----------------
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[DomContentLoaded] loading...");
  // DOM ready ensures we have a CSRF token
  // alert(readCSRFToken());

  const isOnline = await checkServer();
  setAppState({
    isOnline: isOnline,
    status: isOnline ? "online" : "offline",
  });

  const [{ configureTopbar }, { maybeProposeAndroidInstall }] =
    await Promise.all([
      import("@js/utilities/configureTopbar"),
      import("@js/utilities/installAndroid"),
    ]);

  await Promise.all([
    configureTopbar(),
    maybeProposeAndroidInstall(),
    startApp(),
  ]);

  return !appState.interval && startPolling();
});

async function startApp() {
  try {
    // const csrf_token = readCSRFToken();
    // if (!csrf_token) {
    //   throw new Error("CSRF token not found in meta tag");
    // }

    // const isOnline = await checkServer();
    if (!(await checkServer())) {
      return await initOfflineComponents();
    }

    // // console.log(isOnline);
    // setAppState({
    //   isOnline: isOnline,
    //   status: isOnline ? "online" : "offline",
    // });

    if (!window.liveSocket?.isConnected()) {
      // window.liveSocket?.disconnect();
      window.liveSocket = await initLiveSocket();
      window.liveSocket.connect();
      log(" **** App started ****");
    }

    window.liveSocket.getSocket().onOpen(() => {
      console.warn("[LiveSocket] connected");
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// we start the polling heartbeat when the app is loaded
function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (appState.interval) return;

  setAppState(
    "interval",
    setInterval(async () => {
      // const { checkServer } = await import("@js/utilities/checkServer");
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
      { initYDoc },
      { PgStockHook },
      { StockYjsChHook },
      { PwaHook },
      { MapHook },
      { FormHook },
      { LiveSocket },
      { Socket },
    ] = await Promise.all([
      import("@js/stores/initYJS"),
      import("@js/hooks/hookPgStock"),
      import("@js/hooks/hookYjsChStock.js"),
      import("@js/hooks/hookPwa.js"),
      import("@js/hooks/hookMap.js"),
      import("@js/hooks/hookForm.js"),
      import("phoenix_live_view"),
      import("phoenix"),
    ]);

    const globalYdoc = await initYDoc();
    setAppState("globalYdoc", globalYdoc);

    const hooks = {
      StockYjsChHook: StockYjsChHook({
        ydoc: appState.globalYdoc,
      }),
      PgStockHook: PgStockHook({
        ydoc: appState.globalYdoc,
      }),
      MapHook: MapHook({ mapID: CONFIG.MapID }),
      FormHook,
      PwaHook,
    };

    setAppState("hooks", hooks);

    // pass a function to rebuild the CSRF token if changed
    const liveSocket = new LiveSocket("/live", Socket, {
      params: () => ({ _csrf_token: readCSRFToken() }),
      hooks,
    });
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return await initOfflineComponents();
  }
}

// JS.dispatcher for clearing cache
window.addEventListener("phx:clear-cache", async () => {
  const { clearApplicationCaches } = await import("@js/utilities/cacheManager");
  const confirmation = window.confirm(
    "You are going to clear the client cache. Reset now?"
  );
  console.log(confirmation);
  if (confirmation) {
    await clearApplicationCaches();
    window.location.href = "/";
  }
  return;
});

// sent when the authenticated LiveViews mounts
window.addEventListener("phx:access-token-ready", async ({ detail }) => {
  const { user_token, user_id } = detail;
  if (!detail.user_token || appState.userSocket) {
    console.log("[userSocket] already set");
    return;
  }
  return await setOnLineFunctions({ user_token, user_id });
});

async function initOfflineComponents() {
  console.log(appState.isOnline, "offline components init");
  if (appState.isOnline) return;
  log("[Init Offline]---------");
  appState.userSocket?.disconnect();
  window.liveSocket?.disconnect();

  const {
    cleanExistingHooks,
    mountOfflineComponents,
    attachNavigationListeners,
  } = await import("@js/utilities/navigate");
  cleanExistingHooks();
  attachNavigationListeners();
  // and then render the current view
  const _module = await mountOfflineComponents();
  window.liveSocket?.disconnect();
}

async function setOnLineFunctions({ user_token, user_id }) {
  const [
    { checkServer },
    { setUserSocket },
    { setPresence },
    { registerServiceWorker },
  ] = await Promise.all([
    import("@js/utilities/checkServer"),
    import("@js/user_socket/userSocket"),
    import("@js/components/setPresence"),
    import("@js/utilities/pwaRegistration"),
  ]);

  const isOnline = await checkServer();
  if (!isOnline) return;

  const userSocket = await setUserSocket(user_token);
  userSocket.onOpen(async () => {
    log("[userSocket]: open for user:", user_id);

    await setPresence(userSocket, "proxy:presence", user_token);
    setAppState({
      userToken: user_token,
      isOnline,
      userSocket,
      status: isOnline ? "online" : "offline",
    });
    window.dispatchEvent(new CustomEvent("user-socket-ready", {}));
    await registerServiceWorker();
    return;
  });
}

// trigger offline rendering if offline ---------------
window.addEventListener("connection-status-changed", async (e) => {
  log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    return await initOfflineComponents();
  } else {
    window.location.reload();
  }
});

// debug ---
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  // Enable server log streaming to client.
  // Disable with reloader.disableServerLogs()
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
