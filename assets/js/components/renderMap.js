export async function renderMap({ id: mapID }) {
  console.log(mapID);
  const { initMap } = await import("@js/components/initMap.js");
  const { L, map, group, maptLayer } = await initMap(mapID);
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
      if (group && map.hasLayer(group)) {
        group.clearLayers();
        map.removeLayer(group);
      }
      // Remove MaptilerLayer if added
      if (maptLayer && map.hasLayer(maptLayer)) {
        maptLayer.remove(); // or map.removeLayer(maptLayer)
      }
      map.remove();
    }

    console.log("[Map] ---> resources cleaned up");
  };
  return cleanup;
}
