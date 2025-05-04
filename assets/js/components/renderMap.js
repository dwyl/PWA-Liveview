export async function renderMap() {
  const { initMap } = await import("@js/components/initMap.js");
  const { L, map, group, maptLayer } = await initMap();
  const userID = localStorage.getItem("userID");
  const params = { L, map, group, _this: null, userID };

  const { createFlightObserver, createSelectionObserver } = await import(
    "@js/stores/mapObservers.js"
  );
  const selectionObserver = createSelectionObserver(params);
  const flightObserver = await createFlightObserver(params);
  // Valtio observers
  selectionObserver.observeVSelections();
  flightObserver.observeVFlight();

  const cleanup = () => {
    flightObserver.cleanup();
    selectionObserver.cleanup();

    if (map) {
      group.clearLayers();
      map.removeLayer(group);
      map.removeLayer(maptLayer);
      maptLayer.remove();
      map.remove();
    }

    console.log("[Map] ---> resources cleaned up");
  };
  return cleanup;
}
