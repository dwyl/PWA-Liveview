import { state } from "@js/stores/vStore";

export const FormHook = {
  userID: null,
  state,
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
    this.state = state;
    this.userID = Number(this.el.dataset.userid);
    // we need to set the userID in localStorage
    // so that the Solid component can access it when offline
    if (!localStorage.getItem("userID"))
      localStorage.setItem("userID", this.userID);

    const { CitiesForm } = await import("@jsx/components/citiesForm");

    console.log("[FormHook] ~~~~~~~~~~~> mounted");

    // Load cached airports
    const cached = localStorage.getItem("airports");
    console.log(cached?.length, cached?.length > 0, state.airports.length);
    if (cached && state.airports) {
      try {
        state.airports.push(...JSON.parse(cached));
      } catch (e) {
        console.warn("Failed to parse cached airports:", e);
      }
    } else {
      console.log("no cached airports");
    }

    this.pushEvent("cache-checked", {
      cached: cached?.length > 0,
      version: localStorage.getItem("version"),
    });

    this.handleEvent("airports", ({ airports, hash }) => {
      // if (state.airports.length === 0) {
      console.log("airports", hash);
      console.log("no airports in state, fetching from server");
      state.airports.push(...airports);
      localStorage.setItem("airports", JSON.stringify(airports));
      localStorage.setItem("version", hash);
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
