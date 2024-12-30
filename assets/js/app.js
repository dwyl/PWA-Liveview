// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();

let isOffline = false;

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

async function initApp() {
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use

    const { solHook } = await import("./solHook.jsx");
    const SolHook = solHook(ydoc); // setup SolidJS component

    const { MapHook } = await import("./mapHook.jsx");

    // Only try to setup LiveSocket if we're online
    if (navigator.onLine && !isOffline) {
      await initLiveSocket({ SolHook, MapHook });
    }

    // Always try to display the component in offline mode
    if (!navigator.onLine || isOffline) {
      await displayComponent();
    }
  } catch (error) {
    console.error("Init failed:", error);
    // If init fails, try to display offline component
    if (!navigator.onLine || isOffline) {
      await displayComponent();
    }
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

async function displayComponent() {
  try {
    if (!window.SolidComp || !window.ydoc) {
      console.error("Components not available");
      return;
    }

    const container = document.getElementById("solid");
    if (!container) {
      console.error("Solid container not found");
      return;
    }

    return window.SolidComp({
      ydoc: window.ydoc,
      userID: sessionStorage.getItem("userID"),
      max: sessionStorage.getItem("max"),
      el: container,
    });
  } catch (error) {
    console.error("Error displaying component:", error);
  }
}

await initApp();

// Show online/offline status
import("./onlineStatus").then(({ statusListener }) => statusListener());

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
