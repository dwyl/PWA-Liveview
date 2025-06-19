// import { appState } from "@js/stores/AppStore.js";
import { pwaRegistry } from "@js/main";

export const PwaHook = {
  destroyed() {
    window.removeEventListener("sw-ready", this.handleReady);
    window.removeEventListener("sw-error", this.handleError);
    window.removeEventListener("sw-update", this.handleUpdate);

    console.log("[PwaHook] ------> destroyed");
  },
  async mounted() {
    const _this = this;
    const pwaAction = document.getElementById("pwa_action-c");
    if (!pwaAction) {
      console.error("[PwaHook] pwa_action-c not found");
      return;
    }

    // received from regissterServiceWorker()

    this.handleReady = (event) => {
      // push to the LV for the on_mount/attach_hook to fire the flash
      _this.pushEvent("sw-lv-ready", {
        ready: event.detail.ready,
      });
    };

    this.handleUpdate = (event) => {
      // push to the LiveComponent to fire the button
      console.log("[PWA] handleUpdate", event.detail.update);
      _this.pushEventTo(pwaAction, "sw-lv-update", {
        update: event.detail.update,
      });
    };

    this.handleEvent("sw-lv-skip-waiting", async () => {
      if (pwaRegistry.updateSW) {
        return await pwaRegistry.updateSW();
      }
    });

    this.handleError = (event) => {
      // push to the LV for the on_mount/attach_hook to fire the flash
      _this.pushEvent("sw-lv-error", {
        error: event.detail.error,
      });
    };

    // !! the callbacks need to be defined before calling them
    window.addEventListener("sw-ready", this.handleReady);
    window.addEventListener("sw-error", this.handleError);
    window.addEventListener("sw-update", this.handleUpdate);
    console.log("[PwaHook] ----> mounted");
  },
};
