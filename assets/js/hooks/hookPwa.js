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
    // console.log("[PwaHook] -----> mounted");
    const _this = this;
    const pwaAction = document.getElementById("pwa_action-1");

    this.handleEvent("sw-lv-skip-waiting", () => {
      const updateServiceWorker = AppState.updateServiceWorker;
      if (updateServiceWorker) {
        updateServiceWorker();
      }
    });

    this.handleReady = (event) => {
      _this.pushEventTo(pwaAction, "sw-lv-ready", {
        ready: event.detail.ready,
      });
    };

    this.handleError = (event) => {
      _this.pushEvent("sw-lv-error", {
        error: event.detail.error,
      });
    };

    this.handleUpdate = (event) => {
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
    // window.addEventListener("sw-change", this.handleControllerChange);
  },
};
