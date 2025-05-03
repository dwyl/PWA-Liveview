import state from "@js/stores/vStore";

export const MapHook = {
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
      this.map.eachLayer((layer) => {
        this.map.removeLayer(layer);
      });
      this.map.remove();
      this.map = null;
    }

    console.log("[MapVHook] destroyed-----");
  },
  async mounted() {
    try {
      const { initMap } = await import("@js/components/initMap");
      const { L, map, group } = await initMap();
      this.map = map;

      this.userID = Number(this.el.dataset.userid);
      // we need to set the userID in localStorage
      // so that the Solid component can access it when offline
      if (!localStorage.getItem("userID"))
        localStorage.setItem("userID", this.userID);

      console.log("[MapHook] ~~~~~~~~~~~>  mounted");

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
        console.log(airport);
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
};
