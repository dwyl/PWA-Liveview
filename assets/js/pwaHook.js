export const PwaHook = {
  async mounted() {
    const _this = this;
    const { registerSW } = await import("virtual:pwa-register");

    let updateSWFunction;
    const refreshBtn = document.getElementById("refresh-btn");
    refreshBtn.style.display = "none";

    refreshBtn.onclick = () => {
      if (updateSWFunction) {
        updateSWFunction(true);
      } else {
        console.log("No update available");
      }
    };

    const updateSW = registerSW({
      onNeedRefresh() {
        console.log("on refresh needed");
        updateAvailable = true;
        refreshBtn.disabled = false;
        refreshBtn.style.display = "block";
        updateSWFunction = updateSW;
      },
      onOfflineReady() {
        console.log("App ready to work offline");
        _this.pushEvent("offline ready", { msg: "App ready to work offline" });
      },
    });

    updateSW();
  },
};
