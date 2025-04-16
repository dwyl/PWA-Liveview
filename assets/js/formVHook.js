// import { FormVComponent } from "./formVComp.jsx";
import state from "./vStore.js";

export const FormVHook = {
  userID: null,
  destroyed() {
    state.selection.clear();
    if (this.unsubscribe) this.unsubscribe();
    if (this.dispose) this.dispose();

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    console.log("Form destroyed-----");
  },
  async mounted() {
    if (this.cleanupSolid) this.cleanupSolid(); // defensive cleanup
    this.cleanupSolid = null;
    if (this.dispose) this.dispose();
    this.dispose = null;
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;

    const { FormVComponent } = await import("./formVComp.jsx");
    this.userID = this.el.dataset.userid || sessionStorage.getItem("userID");
    console.log(
      "~~~~~~~~~~~> Form mounted",
      window.liveSocket?.socket?.isConnected()
    );
    this.cleanupSolid = null;

    // Load cached airports
    const cached = localStorage.getItem("flight_app_airports");
    if (cached && state.airports.length === 0) {
      try {
        state.airports.push(...JSON.parse(cached));
      } catch (e) {
        console.warn("Failed to parse cached airports:", e);
      }
    }

    // Only fetch airports if we don't have them in state/localStorage
    this.handleEvent("airports", ({ airports }) => {
      if (state.airports.length === 0) {
        state.airports.push(...airports);
        localStorage.setItem("flight_app_airports", JSON.stringify(airports));
      }
    });

    // we return both "dispose" and "cleanup" functions
    // to allow for cleanup of the Solid component and Valtio subscription
    // when the component is destroyed
    this.cleanupSolid = await FormVComponent({ el: this.el, _this: this });
    const { dispose, unsubscribe } = this.cleanupSolid;
    this.dispose = dispose;
    this.unsubscribe = unsubscribe;
  },
};
