import state from "./vStore.js";

export const MapVHook = {
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

    console.log("Map destroyed-----");
  },
  async mounted() {
    console.log(
      "~~~~~~~~~~~>  Map mounted",
      window.liveSocket?.socket?.isConnected()
    );
    try {
      const { initMap } = await import("./initMap.js");
      const { L, map, group } = await initMap();
      this.map = map;

      this.uid = this.el.dataset.userid || sessionStorage.getItem("userID");

      const params = { L, map, group, userID: this.userID, _this: this };
      const { createFlightObserver, createSelectionObserver } = await import(
        "./valtioObservers.js"
      );
      const selectionObserver = createSelectionObserver(params);
      this.selectionObserver = selectionObserver;
      const flightObserver = await createFlightObserver(params);
      this.flightObserver = flightObserver;

      // Valtio observers
      selectionObserver.observeVSelections();
      // selectionObserver.observeDeletionState();
      // selectionObserver.observeVSelections();
      flightObserver.observeVFlight();

      this.handleEvent("do_fly", ({ from, departure, arrival }) => {
        if (from !== this.userID) {
          const departure_latLng = [departure.lat, departure.lng];
          const arrival_latLng = [arrival.lat, arrival.lng];
          flightObserver.handleFlight(departure_latLng, arrival_latLng);
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
};
