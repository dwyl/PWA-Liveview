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
import { FormHook } from "@js/hooks/hookForm.js";

import {
  cleanExistingHooks,
  mountOfflineComponents,
  attachNavigationListeners,
  addCurrentPageToCache,
} from "@js/utilities/navigate";

const CONFIG = appState.CONFIG;

const log = console.log;

document.addEventListener("DOMContentLoaded", async () => {
  log("*----- App start ----");

  window.liveSocket = await initLiveSocket();
  window.liveSocket.getSocket().onOpen(async () => {
    console.warn("[LiveSocket] connected");
    !appState.interval && startPolling();
    if (import.meta.env.MODE === "development") {
      console.warn("Service Worker disabled");
    } else {
      const { registerServiceWorker } = await import(
        "@js/utilities/pwaRegistration"
      );
      setAppState("pwaRegistry", registerServiceWorker);
    }
    // first page cached when the app is loaded
    await addCurrentPageToCache(window.location.pathname);
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
      FormHook,
      PwaHook,
      StockYjsChHook: StockYjsChHook({
        ydoc: appState.globalYdoc,
      }),
      PgStockHook: PgStockHook({ ydoc: appState.globalYdoc }),
      MapHook: await import("@js/hooks/hookMap.js").then(({ MapHook }) =>
        MapHook({ mapID: CONFIG.MapID })
      ),
    };

    setAppState("hooks", hooks);

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
  return csrfTokenEl.getAttribute("content");
}

window.addEventListener("phx:page-loading-stop", async ({ detail }) => {
  // console.log("Page loading?", detail.to);
  if (appState.isOnline) {
    // console.log("[Navigate Cache]-----", detail.to);
    if (detail.to) {
      const path = new URL(detail.to).pathname;
      await addCurrentPageToCache(path);
    }
  }
});

// JS.dispatcher for clearing cache
window.addEventListener("phx:clear-cache", async () => {
  const { clearApplicationCaches } = await import("@js/utilities/cacheManager");
  const confirmation = window.confirm(
    "You are going to clear the client cache. Reset now?"
  );
  if (confirmation) {
    await clearApplicationCaches();
    window.location.href = "/";
  }
  return;
});

// sent when the authenticated LiveViews mounts
window.addEventListener("phx:access-token-ready", setOnlineFunctionsWithToken);

async function setOnlineFunctionsWithToken(e) {
  const { detail } = e;
  console.warn("[access-token-ready]");
  const { user_token, user_id } = detail;
  if (!detail.user_token || appState.userSocket) {
    // console.log("[userSocket] already set");
    return;
  }
  return await setOnLineFunctions({ user_token, user_id });
}

async function initOfflineComponents() {
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
  const [{ setUserSocket }, { setPresence }] = await Promise.all([
    import("@js/user_socket/userSocket"),
    import("@js/components/setPresence"),
  ]);
  const userSocket = await setUserSocket(user_token);
  userSocket.onOpen(async () => {
    log("[userSocket]: opened for:", user_id);

    await setPresence(userSocket, "proxy:presence", user_token);
    setAppState({
      userToken: user_token,
      userSocket,
    });
    window.dispatchEvent(new CustomEvent("user-socket-ready", {}));
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
