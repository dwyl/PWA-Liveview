export function installAndroid() {
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
