import { state } from "@js/stores/vStore";

export const MapHook = ({ mapID }) => ({
  map: null,
  flightObserver: null,
  selectionObserver: null,
  destroyed() {
    state.selection.clear();

    if (this.selectionObserver) {
      this.selectionObserver.cleanup(); // 👈 clean up selection observer
      this.selectionObserver = null;
    }

    if (this.flightObserver) {
      this.flightObserver.cleanup(); // 👈 clean up flight observer
      this.flightObserver = null;
    }

    if (this.map) {
      this.group.clearLayers();
      this.map.removeLayer(this.maptLayer);
      this.map.remove();
      this.maptLayer = null;
      this.group = null;
      this.map = null;
    }

    console.log("[MapVHook] resources destroyed-----");
  },
  async mounted() {
    try {
      const { initMap } = await import("@js/components/initMap");
      const { L, map, group, maptLayer } = await initMap(mapID);
      this.map = map;
      this.group = group;
      this.maptLayer = maptLayer;

      this.userID = Number(this.el.dataset.userid);
      // we need to set the userID in localStorage
      // so that the Solid component can access it when offline
      if (!localStorage.getItem("userID"))
        localStorage.setItem("userID", this.userID);

      // console.log("[MapHook] ~~~~~~~~~~~>  mounted");

      const params = { L, map, group, userID: this.userID, _this: this };
      const { createFlightObserver, createSelectionObserver } = await import(
        "@js/stores/mapObservers"
      );
      const selectionObserver = createSelectionObserver(params);
      this.selectionObserver = selectionObserver;
      const flightObserver = await createFlightObserver(params);
      this.flightObserver = flightObserver;

      // Valtio observers
      selectionObserver.observeVSelections();
      await flightObserver.observeVFlight();

      this.handleEvent("do_fly", async ({ from, departure, arrival }) => {
        if (from !== this.userID) {
          const departure_latLng = [departure.lat, departure.lng];
          const arrival_latLng = [arrival.lat, arrival.lng];
          await flightObserver.handleFlight(departure_latLng, arrival_latLng);
        }
      });
      // event from other user
      this.handleEvent("added_airport", (airport) => {
        if (
          airport.action === "added_airport" &&
          this.userID !== airport.userID
        ) {
          state.selection.set(airport.inputType, {
            ...airport,
            broadcasted: true,
          });
        }
      });
      this.handleEvent("delete_airports", (airport) => {
        state.deletionState.isDeleted = true;
        state.deletionState.timestamp = airport.timestamp || Date.now();
        state.deletionState.deletedBy = airport.userID;
      });
    } catch (error) {
      console.error(`Unable to run the map`, error);
      throw error;
    }
  },
});
