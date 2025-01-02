import "../css/app.css";
// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { updateSW } from "./refreshSW.js";

updateSW();

const paths = new Set();
const myroutes = ["/", "/map"];
let lineStatus = true;

async function addCurrentPageToCache({ current, routes }) {
  await navigator.serviceWorker.ready;
  const newPath = new URL(current).pathname;

  if (!routes.includes(newPath)) return;
  if (paths.has(newPath)) return;

  if (newPath === window.location.pathname) {
    console.log("addCurrentPageToCache", newPath, window.location.pathname);
    paths.add(newPath);
    const htmlContent = document.documentElement.outerHTML;
    const contentLength = new TextEncoder().encode(htmlContent).length;
    const headers = new Headers({
      "Content-Type": "text/html",
      "Content-Length": contentLength,
    });

    const response = new Response(htmlContent, {
      headers: headers,
      status: 200,
      statusText: "OK",
    });

    const cache = await caches.open("lv-pages");
    return cache.put(current, response);
  } else return;
}

// we cache the two pages "/3 and "/map" only once.
navigation.addEventListener("navigate", async ({ destination: { url } }) => {
  console.log("navigate", url, window.location.pathname);
  return addCurrentPageToCache({ current: url, routes: myroutes });
});

//---------------
async function checkOnlineStatus() {
  try {
    const response = await fetch("/test");
    console.log(response);
    return response.ok || false;
  } catch (error) {
    console.error("Error checking online status:", error);
    return false;
  }
}

// --------------
window.addEventListener("online", () => window.location.reload());
//--------------

//--------------
async function initApp(lineStatus) {
  console.log("initApp----", lineStatus);
  try {
    const { default: initYdoc } = await import("./initYJS.js");
    const ydoc = await initYdoc();
    window.ydoc = ydoc; // Set this early so it's available for offline use
    const { solHook } = await import("./solHook.jsx");
    const { MapHook } = await import("./mapHook.jsx");

    if (lineStatus) {
      const SolHook = solHook(ydoc); // setup SolidJS component
      // window.MapHook = MapHook; // setup Map component
      return initLiveSocket({ SolHook, MapHook });
    }

    const path = window.location.pathname;

    if (path === "/map") {
      // window.MapHook = MapHook; // setup Leaflet Map component
      return displayMap();
    } else if (path === "/") {
      solHook(ydoc); // setup SolidJS component
      return displayStock();
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

// **************************************
lineStatus = await checkOnlineStatus();
await initApp(lineStatus);

if ("serviceWorker" in navigator && lineStatus) {
  await addCurrentPageToCache({
    current: window.location.href,
    routes: myroutes,
  });
}

//--------------
// Show online/offline status
import("./onlineStatus.js").then(({ statusListener }) => statusListener());

//--------------
// Show progress bar on live navigation and form submits
await import("../vendor/topbar.cjs").then(configureTopbar);

async function configureTopbar({ default: topbar }) {
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
