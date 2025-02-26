// import { FormVComponent } from "./formVComp.jsx";
import state from "./vStore.js";

export const FormVHook = {
  userID: null,
  destroyed() {
    state.selection.clear();
    console.log("Form destroyed-----");
  },
  async mounted() {
    const { FormVComponent } = await import("./formVComp.jsx");
    this.userID = sessionStorage.getItem("userID");
    console.log("Form mounted----");

    // Only fetch airports if we don't have them in state/localStorage
    this.handleEvent("airports", ({ airports }) => {
      if (state.airports.length === 0) {
        state.airports.push(...airports);
        localStorage.setItem("flight_app_airports", JSON.stringify(airports));
      }
    });

    FormVComponent({ el: this.el, _this: this });
  },
};
