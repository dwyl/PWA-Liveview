// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "../css/app.css";
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();
//---------------
let isOffline = !navigator.onLine;

//--------------
function setupOfflineComponentObserver(elementId, renderCallback) {
  console.log("Setting up offline component observer");
  const targetElement = document.getElementById(elementId);

  if (!targetElement || !isOffline) {
    return;
  }

  console.log(`Observing offline component: ${elementId}`);
  const observer = new MutationObserver(renderCallback);
  observer.observe(targetElement, { childList: true, subtree: true });
}

// Usage in your DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  setupOfflineComponentObserver("solid", handleStockOfflineRender);
  setupOfflineComponentObserver("map", handleMapOfflineRender);
});

const handleStockOfflineRender = async (mutationsList, observer) => {
  if (mutationsList.length === 0) {
    await displayStock();
  }
};

const handleMapOfflineRender = async (mutationsList, observer) => {
  if (mutationsList.length === 0) {
    await displayMap();
  }
};

//--------------
const onlineStatusHandlers = {
  // handle reconnection
  online: () => {
    isOffline = false;
    window.location.reload();
  },
  offline: () => {
    isOffline = true;
  },
};

window.addEventListener("online", onlineStatusHandlers.online);
window.addEventListener("offline", onlineStatusHandlers.offline);

//--------------
async function initApp() {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use

    const { solHook } = await import("./solHook.jsx");
    const SolHook = solHook(ydoc); // setup SolidJS component

    const { MapHook } = await import("./mapHook.jsx");
    window.MapHook = MapHook; // setup Map component

    // Only try to setup LiveSocket if we're online
    if (navigator.onLine && !isOffline) {
      await initLiveSocket({ SolHook, MapHook });
    }

    // Always try to display the component in offline mode
    if (!navigator.onLine || isOffline) {
      if (document.getElementById("map")) {
        await displayMap();
      } else if (document.getElementById("solid")) {
        return displayStock();
      }
    }
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initLiveSocket({ SolHook, MapHook }) {
  const { LiveSocket } = await import("phoenix_live_view");
  const { Socket } = await import("phoenix");
  const csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute("content");

  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 100,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook, MapHook },
  });

  liveSocket.connect();
  window.liveSocket = liveSocket;
}

async function displayMap() {
  const { RenderMap } = await import("./mapHook.jsx");
  console.log("Map rendering-----");
  return RenderMap();
}

async function displayStock() {
  try {
    if (!window.SolidComp || !window.ydoc) {
      console.error("Components not available");
      return;
    }
    console.log("Solid rendering-----");
    return window.SolidComp({
      ydoc: window.ydoc,
      userID: sessionStorage.getItem("userID"),
      max: sessionStorage.getItem("max"),
      el: document.getElementById("solid"),
    });
  } catch (error) {
    console.error("Error displaying component:", error);
  }
}

await initApp();

//--------------
// Show online/offline status
import("./onlineStatus.js").then(({ statusListener }) => statusListener());
//--------------
// Show progress bar on live navigation and form submits
import("../vendor/topbar.cjs").then(configureTopbar);

function configureTopbar({ default: topbar }) {
  topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
  window.addEventListener("phx:page-loading-start", (_info) =>
    topbar.show(300)
  );
  window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());
}

// Enable server log streaming to client. Disable with reloader.disableServerLogs()
window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
  reloader.enableServerLogs();
  window.liveReloader = reloader;
});
