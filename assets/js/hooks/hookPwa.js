import { AppState } from "@js/main";

export const PwaHook = {
  destroyed() {
    window.removeEventListener("sw-ready", this.handleReady);
    window.removeEventListener("sw-error", this.handleError);
    window.removeEventListener("sw-update", this.handleUpdate);
    // window.removeEventListener(
    //   "sw-controller-change",
    //   this.handleControllerChange
    // );
    console.log("[PwaHook] ------> destroyed");
  },
  async mounted() {
    const _this = this;
    const pwaAction = document.getElementById("pwa_action-1");

    // received from the LiveComponent "lv_component_header" after user's action
    this.handleEvent("sw-lv-skip-waiting", () => {
      const updateServiceWorker = AppState.updateServiceWorker;
      if (updateServiceWorker) {
        updateServiceWorker();
      }
    });

    this.handleReady = (event) => {
      // push to the LV for the on_mount/attach_hook to fire the flash
      _this.pushEvent("sw-lv-ready", {
        ready: event.detail.ready,
      });
    };

    this.handleError = (event) => {
      // push to the LV for the on_mount/attach_hook to fire the flash
      _this.pushEvent("sw-lv-error", {
        error: event.detail.error,
      });
    };

    this.handleUpdate = (event) => {
      // push to the LiveComponent to fire the button
      _this.pushEventTo(pwaAction, "sw-lv-update", {
        update: event.detail.update,
      });
    };
    // this.handleControllerChange = (event) => {
    //   _this.pushEvent("sw-lv-change", {
    //     changed: event.detail.changed,
    //   });
    // };

    window.addEventListener("sw-ready", this.handleReady);
    window.addEventListener("sw-error", this.handleError);
    window.addEventListener("sw-update", this.handleUpdate);
    console.log("[PwaHook] -----> mounted");
    // window.addEventListener("sw-change", this.handleControllerChange);
  },
};
