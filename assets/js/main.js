import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { appState, setAppState } from "@js/stores/AppStore.js";
import { checkServer } from "@js/utilities/checkServer.js";
import { configureTopbar } from "@js/utilities/configureTopbar.js";
import { initYDoc } from "@js/stores/initYJS.js";
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import { PgStockHook } from "@js/hooks/hookPgStock";
import { StockYjsChHook } from "@js/hooks/hookYjsChStock.js";
import { PwaHook } from "@js/hooks/hookPwa.js";
import { MapHook } from "@js/hooks/hookMap.js";
import { FormHook } from "@js/hooks/hookForm.js";
import { setUserSocket } from "@js/user_socket/userSocket";
import { setPresence } from "@js/components/setPresence";
import { registerServiceWorker } from "@js/utilities/pwaRegistration";
import {
  cleanExistingHooks,
  mountOfflineComponents,
  attachNavigationListeners,
} from "@js/utilities/navigate";

const CONFIG = appState.CONFIG;

// NOTE: pwaRegistry is a plain object so we can store callable functions
// without SolidJS proxy interference.
export const pwaRegistry = {};

const log = console.log;

//<- debugging only
// window.appState = appState;
// window.pwaRegistry = pwaRegistry;

//  ----------------
document.addEventListener("DOMContentLoaded", async () => {
  //   // DOM ready ensures we have a CSRF token
  // alert(readCSRFToken());

  window.liveSocket = await initLiveSocket();
  log(" **** App started ****");
  window.liveSocket.getSocket().onOpen(async () => {
    console.warn("[LiveSocket] connected");
    !appState.interval && startPolling();
    await registerServiceWorker();
  });

  configureTopbar();
});

// we start the polling heartbeat when the app is loaded
function startPolling(interval = CONFIG.POLL_INTERVAL) {
  if (appState.interval) return;

  setAppState(
    "interval",
    setInterval(async () => {
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
    liveSocket.connect();
    return liveSocket;
  } catch (error) {
    console.error("Error initializing LiveSocket:", error);
    return await initOfflineComponents();
  }
}

function readCSRFToken() {
  const csrfTokenEl = document.querySelector("meta[name='csrf-token']");
  if (!csrfTokenEl) {
    throw new Error("CSRF token not found in meta tag");
  }
  return csrfTokenEl.content;
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
  console.log("[phx:access-token-ready]");
  return await setOnLineFunctions({ user_token, user_id });
});

async function initOfflineComponents() {
  console.log(appState.isOnline, "offline components init");
  if (appState.isOnline) return;
  log("[Init Offline]---------");
  appState.userSocket?.disconnect();
  window.liveSocket?.disconnect();
  cleanExistingHooks();
  attachNavigationListeners();
  // and then render the current view
  const _module = await mountOfflineComponents();
  window.liveSocket?.disconnect();
}

async function setOnLineFunctions({ user_token, user_id }) {
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
// window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
//   // Enable server log streaming to client.
//   // Disable with reloader.disableServerLogs()
//   reloader.enableServerLogs();
//   window.liveReloader = reloader;
// });
