// Track offline notification state at module level
let hasNotifiedOfflineReady = false;

export const PwaHook = {
  async mounted() {
    const _this = this;
    const { registerSW } = await import("virtual:pwa-register");
    console.log("LiveView mounted, current path:", window.location.pathname);

    this.updateAvailable = false;
    let updateSWFunction;
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log("New version available");
        this.updateAvailable = true;
        updateSWFunction = updateSW;

        // Let LiveView handle the button visibility
        _this.pushEvent("pwa-update-available", {
          updateAvailable: true,
        });
      },
      immediate: false, // Prevents immediate registration on page load
      onOfflineReady() {
        // Only notify once when service worker is first installed
        if (!hasNotifiedOfflineReady) {
          console.log("Service Worker installed - App ready for offline use");
          _this.pushEvent("pwa-offline-ready", {
            msg: "App ready for offline use",
          });
          hasNotifiedOfflineReady = true;
        }
      },
      onRegisterError(error) {
        console.error("SW registration error", error);
        _this.pushEvent("pwa-registration-error", {
          error: error.toString(),
        });
      },
    });

    this.handleEvent("confirm-update", () => {
      if (updateSWFunction) {
        // This will trigger the update
        updateSWFunction(true);
      }
    });

    updateSW();
  },
};
