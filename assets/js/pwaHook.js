// Track offline notification state at module level
let hasNotifiedOfflineReady = false;
const { registerSW } = await import("virtual:pwa-register");

export const PwaHook = {
  mounted() {
    const _this = this;
    console.log("PwaHook mounted");

    this.updateAvailable = false;
    let updateSWFunction;

    // Register service worker
    const updateSW = registerSW({
      onNeedRefresh: () => {
        console.log("New version available");
        _this.updateAvailable = true;
        updateSWFunction = updateSW;

        // Let LiveView handle the button visibility
        _this.pushEvent("pwa-update-available", {
          updateAvailable: true,
        });
      },
      immediate: false, // Prevents immediate registration on page load
      onOfflineReady: () => {
        // Only notify once when service worker is first installed
        if (!hasNotifiedOfflineReady) {
          console.log("Service Worker installed - App ready for offline use");
          _this.pushEvent("pwa-offline-ready", {
            msg: "App ready for offline use",
          });
          hasNotifiedOfflineReady = true;
        }
      },
      onRegisterError: (error) => {
        console.error("SW registration error", error);
        _this.pushEvent("pwa-registration-error", {
          error: error.toString(),
        });
      },
    });

    // Handle the confirm-update event triggered by the user
    _this.handleEvent("confirm-update", () => {
      if (updateSWFunction) {
        // Trigger the update
        updateSWFunction(true);
      } else {
        console.warn("Service worker update function not available");
      }
    });
  },
};
