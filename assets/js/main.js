import "@css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";

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
  // MapID: "hook-map",
  MapID: "hook-map",
  hooks: {
    PgStockHook: "hook-pg",
    StockYjsChHook: "hook-yjs-sql3",
    MapHook: "hook-map",
    FormHook: "hook-select-form",
  },
};

const AppState = {
  status: "offline",
  isOnline: true,
  interval: null,
  globalYdoc: null,
  userSocket: null,
  updateServiceWorker: null,
  userToken: null,
  userSocket: null,
  hooks: null,
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

    Object.assign(AppState, {
      userToken: user_token,
      globalYdoc,
      isOnline,
      userSocket,
    });

    AppState.status = AppState.isOnline ? "online" : "offline";

    if (isOnline) {
      return (window.liveSocket = await initLiveSocket());
    } else {
      return await initOfflineComponents();
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// we start the polling heartbeat when the app is loaded
startApp().then(() => {
  return !AppState.interval && startPolling();
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
        ydoc: AppState.globalYdoc,
        userSocket: AppState.userSocket,
      }),
      PgStockHook: PgStockHook({
        ydoc: AppState.globalYdoc,
        userSocket: AppState.userSocket,
      }),
      MapHook: MapHook({ mapID: CONFIG.MapID }),
      FormHook,
      PwaHook,
    };
    AppState.hooks = hooks;

    const liveSocket = new LiveSocket("/live", Socket, {
      // longPollFallbackMs: 2000,
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
  if (AppState.isOnline) return;
  console.log("Init Offline Components---------");
  const { injectComponentIntoView, attachNavigationListeners } = await import(
    "@js/utilities/navigate"
  );
  cleanExistingHooks();
  // first hijack the navigation to avoid the page reload
  attachNavigationListeners();
  // and then render the current view
  return await injectComponentIntoView();
}

function cleanExistingHooks() {
  // Clean up hooks
  // if (AppState.hooks) {
  // for (const hook in AppState.hooks) {
  //   const domElt = document.getElementById(domId);
  //   if (
  //     domElt &&
  //     AppState.hooks[hook] &&
  //     typeof AppState.hooks[hook].destroyed === "function"
  //   ) {
  //     AppState.hooks[hook].destroyed();
  //     domElt.innerHTML = "";
  //     console.log(`Called destroyed() for ${hook}`);
  //   }
  // }
  if (AppState.hooks === null) return;

  for (const key in AppState.hooks) {
    const domId = CONFIG.hooks[key];
    const domElt = document.getElementById(domId);
    if (domElt && typeof AppState.hooks[key].destroyed === "function") {
      AppState.hooks[key].destroyed();
      domElt.innterHTML = "";
    }
  }
  AppState.hooks = null;
  // }
}

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
  return installAndroid();
});

// trigger offline rendering if offline ---------------
window.addEventListener("connection-status-changed", async (e) => {
  console.log("Connection status changed to:", e.detail.status);
  if (e.detail.status === "offline") {
    AppState.status = "offline";
    return await initOfflineComponents();
  } else {
    window.location.reload();
  }
});

function installAndroid() {
  const installButton = document.getElementById("install-button");
  if (!("BeforeInstallPromptEvent" in window)) {
    console.log("beforeinstallprompt not supported");
    installButton.style.display = "none";
    return;
  }

  let deferredPrompt;
  let installButtonClickHandler;

  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      console.log("[PWA install] prompt available");
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton();
    },
    { once: true }
  );

  function handleInstallClick() {
    console.log("click");
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        console.log(`Install prompt result: ${choiceResult.outcome}`);
        deferredPrompt = null;
        hideInstallButton();
      });
    }
  }

  function showInstallButton() {
    if (installButton) {
      installButton.style.display = "block";
      if (!installButtonClickHandler) {
        installButtonClickHandler = handleInstallClick;
        installButton.addEventListener("click", installButtonClickHandler);
      }
    }
  }

  function hideInstallButton() {
    if (installButton) {
      installButton.style.display = "none";

      // Clean up the event listener using the stored reference
      if (installButtonClickHandler) {
        installButton.removeEventListener("click", installButtonClickHandler);
        installButtonClickHandler = null;
      }
    }
  }

  console.log(navigator.userAgent);
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.addEventListener("DOMContentLoaded", () => {
      if (installButton) {
        installButton.style.display = "none";
      }
    });

    console.log("iOS detected - users can install via Safari Share menu");
  }
}
