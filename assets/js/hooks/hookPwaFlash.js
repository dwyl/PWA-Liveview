export const PwaFlash = {
  desroyed() {},
  mounted() {
    window.addEventListener("pwa-ready", (event) => {
      this.pushEvent("pwa-ready", {
        ready: event.detail.ready,
      });
    });
  },
};
