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

  window.addEventListener("offline", () => {
    console.log("---> off");
    return setOnline(domEl, lineStatus.off);
  });

  window.addEventListener("online", () => {
    console.log("---> on");
    setOnline(domEl, lineStatus.on);
  });
}
