import { state } from "@js/stores/vStore";

/**
 * Phoenix LiveView hook that manages an airport selection form with caching and offline support.
 * Integrates with Valtio state management and renders a SolidJS component for the UI.
 * Handles bidirectional data synchronization between server and local storage.
 *
 * @namespace FormHook
 * @type {Object}
 *
 * @description
 * This hook provides a complete form management system with:
 * 1. User identification and persistence via localStorage
 * 2. Airport data caching with version control
 * 3. Bidirectional sync between server and local storage
 * 4. SolidJS component rendering for reactive UI
 * 5. Automatic cleanup of resources and state
 *
 * The hook manages offline scenarios by caching airport data locally
 * and restoring it when the component mounts.
 */
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

    // console.log("[FormHook] ~~~~~~~~~~~> mounted");

    // Load cached airports
    const cached = localStorage.getItem("airports");
    // if localStorage but no state...
    if (cached && state?.airports.length === 0) {
      try {
        // load to state
        state.airports.push(...JSON.parse(cached));
      } catch (e) {
        console.warn("Failed to parse cached airports:", e);
      }
    }

    this.pushEvent("cache-checked", {
      cached: cached?.length > 0,
      version: localStorage.getItem("version"),
    });

    this.handleEvent("airports", ({ airports, hash }) => {
      localStorage.setItem("airports", JSON.stringify(airports));
      localStorage.setItem("version", hash);
      state.airports = [...airports];
    });

    const { CitiesForm } = await import("@jsx/components/citiesForm");

    this.cleanupSolid = CitiesForm({
      el: this.el,
      _this: this,
      userID: this.userID,
    });
  },
};
