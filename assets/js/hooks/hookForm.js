import { state } from "@js/stores/vStore";

export const FormHook = {
  userID: null,
  state,
  destroyed() {
    state.selection.clear();

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
    if (cached) {
      try {
        console.log("Setup cached airports");
        state.airports = JSON.parse(cached);
      } catch (e) {
        console.warn("Failed to parse cached airports:", e);
      }
    } else {
      console.log("No cached airports");
    }

    this.pushEvent("cache-checked", {
      cached: cached?.length > 0,
      version: localStorage.getItem("version"),
    });

    this.handleEvent("airports", ({ airports, hash }) => {
      console.log("Loading server data to localStorage and state");
      localStorage.setItem("airports", JSON.stringify(airports));
      localStorage.setItem("version", hash);
      state.airports = airports;
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
