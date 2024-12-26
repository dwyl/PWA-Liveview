const lineStatus = {
  on: { bg: "lavender", opacity: 0.8 },
  off: { bg: "tomato", opacity: 1 },
};

function setOnline(el, status) {
  el.style.opacity = status.opacity;
  el.style.backgroundColor = status.bg;
}

export function statusListener() {
  const domEl = document.getElementById("online-status");
  window.onoffline = () => {
    setOnline(domEl, lineStatus.off);
    navigator.serviceWorker.controller.postMessage({
      type: `IS_OFFLINE`,
      // add more properties if needed
    });
  };
  window.ononline = () => {
    setOnline(domEl, lineStatus.on);
    navigator.serviceWorker.controller.postMessage({
      type: `IS_ONLINE`,
      // add more properties if needed
    });
  };
}
