import state from "@js/stores/vStore";

export const FormHook = {
  userID: null,
  destroyed() {
    state.selection.clear();
    // if (this.unsubscribe) this.unsubscribe();
    // if (this.dispose) this.dispose();

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    console.log("[FormHook] destroyed-----");
  },
  async mounted() {
    if (this.cleanupSolid) this.cleanupSolid(); // defensive cleanup
    this.cleanupSolid = null;

    this.userID = Number(this.el.dataset.userid);
    // we need to set the userID in localStorage
    // so that the Solid component can access it when offline
    if (!localStorage.getItem("userID"))
      localStorage.setItem("userID", this.userID);

    const { CitiesForm } = await import("@jsx/components/citiesForm");

    console.log("[FormHook] ~~~~~~~~~~~> mounted");

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
        console.log("no airports loaded");
        state.airports.push(...airports);
        localStorage.setItem("flight_app_airports", JSON.stringify(airports));
      }
    });

    // we return both "dispose" and "cleanup" functions
    // to allow for cleanup of the Solid component and Valtio subscription
    // when the component is destroyed
    this.cleanupSolid = CitiesForm({
      el: this.el,
      _this: this,
      userID: this.userID,
    });
  },
};
