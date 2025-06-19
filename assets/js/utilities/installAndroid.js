export async function maybeProposeAndroidInstall() {
  const installButton = document.getElementById("install-button");
  if (installButton.dataset.os.toLowerCase() !== "android") {
    console.log("Not Android---");
    return;
  }

  const { UAParser } = await import("ua-parser-js");
  const result = UAParser.getResult();

  if (result.os.name === "Android") {
    installButton.classList.remove("hidden");
    installButton.classList.add("flex");

    return installAndroid(installButton);
  } else {
    console.log("[UAParser] Not Android, no install button");
    installButton.classList.add("hidden");
    installButton.classList.remove("flex");
  }
}

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
}
