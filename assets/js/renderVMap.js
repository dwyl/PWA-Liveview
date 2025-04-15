export async function RenderVMap() {
  const { initMap } = await import("./initMap.js");
  const { L, map, group } = await initMap();
  const userID = sessionStorage.getItem("userID");
  const params = { L, map, group, _this: null, userID };

  const { createFlightObserver, createSelectionObserver } = await import(
    "./valtioObservers.js"
  );
  const selectionObserver = createSelectionObserver(params);
  const flightObserver = await createFlightObserver(params);
  // Valtio observers
  selectionObserver.observeVSelections();
  flightObserver.observeVFlight();

  flightObserver.cleanup();
  selectionObserver.cleanup();
}
