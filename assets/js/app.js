// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar.cjs";
import initYdoc from "./initYJS.js";

// let liveSocket = null;

async function init() {
  const ydoc = await initYdoc();
  const { solHook } = await import("./solHook");
  const SolHook = solHook(ydoc);
  const liveSocket = new LiveSocket("/live", Socket, {
    longPollFallbackMs: 2500,
    params: { _csrf_token: csrfToken },
    hooks: { SolHook },
  });
  liveSocket.connect();
  window.liveSocket = liveSocket;
}

init();

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");

import("./onlineStatus").then(({ statusListener }) => statusListener());

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (_info) => topbar.show(300));
window.addEventListener("phx:page-loading-stop", (_info) => topbar.hide());

// connect if there are any LiveViews on the page

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
