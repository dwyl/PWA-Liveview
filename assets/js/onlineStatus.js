const lineStatus = {
  on: { bg: "lavender", opacity: 0.8 },
  off: { bg: "tomato", opacity: 1 },
};

function setOnline(el, status) {
  if (!el) return;
  el.style.opacity = status.opacity;
  el.style.backgroundColor = status.bg;
}

export function statusListener() {
  const domEl = document.getElementById("online-status");

  // Check initial status immediately
  setOnline(domEl, navigator.onLine ? lineStatus.on : lineStatus.off);

  // if (!navigator.onLine && navigator.serviceWorker.controller) {
  //   navigator.serviceWorker.controller.postMessage({
  //     type: "IS_OFFLINE",
  //   });
  // }

  window.addEventListener("offline", () => {
    setOnline(domEl, lineStatus.off);
    // navigator.serviceWorker.controller?.postMessage({
    //   type: "IS_OFFLINE",
    // });
  });

  window.addEventListener("online", () => {
    setOnline(domEl, lineStatus.on);
    // navigator.serviceWorker.controller?.postMessage({
    //   type: "IS_ONLINE",
    // });
  });
}
