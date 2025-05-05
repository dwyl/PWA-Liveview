export const PwaHook = {
  desroyed() {},
  mounted() {
    window.addEventListener("sw-ready", (event) => {
      this.pushEvent("sw-lv-ready", {
        ready: event.detail.ready,
      });
    });
    window.addEventListener("sw-error", (event) => {
      this.pushEvent("sw-lv-error", {
        ready: event.detail.error,
      });
    });
    window.addEventListener("sw-update", (event) => {
      this.pushEvent("sw-lv-update", {
        update_available: event.detail.update_available,
      });
    });
  },
};
