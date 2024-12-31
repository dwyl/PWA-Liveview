import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();
//---------------
const lineStatus = { on: true };

async function checkOnlineStatus() {
  try {
    const response = await fetch("/test");
    if (response.ok) return response.ok;
  } catch (error) {
    console.error("Error checking online status:", error);
    return false;
  }
}

window.addEventListener("online", () => window.location.reload());
//--------------
/*
function setupOfflineComponentObserver(elementId, renderCallback) {
  console.log("Observer", elementId);
  const targetElement = document.getElementById(elementId);
  if (!targetElement || window.liveSocket?.isConnected()) {
    return;
  }

  const observer = new MutationObserver(renderCallback);
  observer.observe(targetElement, { childList: true, subtree: true });
}

// phx:page-loading-start
window.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname === "/") {
    setupOfflineComponentObserver("solid", handleSolidOfflineRender);
  } else if (window.location.pathname === "/map") {
    setupOfflineComponentObserver("map", handleMapOfflineRender);
  }
});

const handleSolidOfflineRender = async (mutationsList, observer) => {
  console.log(mutationsList.length);
  if (mutationsList.length === 0) {
    await displayStock();
  }
};

const handleMapOfflineRender = async (mutationsList, observer) => {
  console.log(mutationsList.length);
  if (mutationsList.length === 0) {
    await displayMap();
  }
};

//--------------

// window.addEventListener("online", () => (lineStatus.on = true));
// window.addEventListener("offline", () => (lineStatus.on = false));
*/
//--------------
async function initApp({ on }) {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use

    if (on) {
      const { solHook } = await import("./solHook.jsx");
      const SolHook = solHook(ydoc); // setup SolidJS component

      const { MapHook } = await import("./mapHook.jsx");
      window.MapHook = MapHook; // setup Map component
      return initLiveSocket({ SolHook, MapHook });
    }

    const path = window.location.pathname;
    // if (!on) {

    if (path === "/map") {
      const { MapHook } = await import("./mapHook.jsx");
      window.MapHook = MapHook; // setup Leaflet Map component
      return displayMap();
    } else if (path === "/") {
      const { solHook } = await import("./solHook.jsx");
      solHook(ydoc); // setup SolidJS component
      return displayStock();
    }
    // }
  } catch (error) {
    console.error("Init failed:", error);
  }
}

async function initLiveSocket({ SolHook, MapHook }) {
  console.log("initLiveSocket");
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
  liveSocket.getSocket().onOpen(() => {
    console.log("Socket connected", liveSocket?.isConnected());
  });
  return true;
}

async function displayMap() {
  const { RenderMap } = await import("./mapHook.jsx");
  console.log("Map rendering-----");
  return RenderMap();
}

async function displayStock() {
  console.log("displayStock");
  try {
    if (!window.SolidComp || !window.ydoc) {
      console.error("Components not available", window.SolidComp, window.ydoc);
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

lineStatus.on = await checkOnlineStatus();

console.log(
  "initial line status: socket, navigator, onlineStatus: ",
  window.liveSocket?.isConnected(),
  navigator.onLine,
  lineStatus.on
);
await initApp(lineStatus);

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
