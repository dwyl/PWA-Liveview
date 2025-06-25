import { state } from "./vStore.js";
import { subscribe } from "valtio/vanilla";
import airplaneIcon from "@assets/airplane.svg?url";
import airplaneIconInverse from "@assets/airplane_inv.svg?url";

export async function createFlightObserver({ L, map, group }) {
  let currentAnimationInterval = null;
  let unFlight = null;
  const { loadWasm } = await import("@js/utilities/loadWasm");

  function airplaneMarker(L, latLngs, inverse = false) {
    const east = airplaneIcon;
    const west = airplaneIconInverse;
    // const east = new URL("/images/airplane.svg", import.meta.url).href;
    // const west = new URL("/images/airplane_inv.svg", import.meta.url).href;
    const airplane = L.marker(latLngs[0], {
      icon: new L.Icon({
        iconUrl: inverse ? east : west,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      }),
    });
    // inverse ? (airplane.className = "rotate-180 origin-center") : null;
    return airplane;
  }
  async function computeGreatCircle({ L, group, departure, arrival }) {
    const { lat: latA, lng: lngA } = arrival;
    const { lat: latD, lng: lngD } = departure;
    try {
      const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
        await loadWasm();
      const ptr = computeGreatCirclePoints(latD, lngD, latA, lngA);
      if (!ptr) return;

      const size = getBufferSize();
      const greatCircle = new Float64Array(memory.buffer, ptr, size / 8);
      // Convert to array of LatLng points for Leaflet
      const latLngs = [];
      for (let i = 0; i < greatCircle.length; i += 2) {
        latLngs.push(L.latLng(greatCircle[i], greatCircle[i + 1]));
      }
      memfree(ptr, size);
      L.polyline(latLngs, { renderer: L.canvas() }).addTo(group);
      return latLngs;
    } catch (error) {
      console.error("GreatCircle module error", error);
      throw error;
    }
  }
  async function animate({ L, group, latLngs, inverse }, animationTime = 200) {
    if (currentAnimationInterval) {
      clearInterval(currentAnimationInterval);
      currentAnimationInterval = null;
    }

    const marker = airplaneMarker(L, latLngs, inverse);
    marker.addTo(group);

    let idx = 0;
    try {
      return new Promise((resolve) => {
        currentAnimationInterval = setInterval(() => {
          if (idx >= latLngs.length - 1) {
            clearInterval(currentAnimationInterval);
            currentAnimationInterval = null;
            return resolve();
          } else {
            marker.setLatLng(latLngs[idx]);
            idx++;
          }
        }, animationTime);
      });
    } catch (error) {
      // Ensure cleanup happens even if promise is rejected
      if (currentAnimationInterval) {
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
      group.removeLayer(marker);
      throw error;
    }
  }

  async function animateRoute({ L, map, group, departure, arrival, inverse }) {
    try {
      const A = L.latLng(arrival);
      const D = L.latLng(departure);
      const bounds = L.latLngBounds(A, D);
      map.fitBounds(bounds);

      const latLngs = await computeGreatCircle({
        L,
        group,
        departure,
        arrival,
      });

      return await animate({ L, group, latLngs, inverse }, 200);
    } catch (error) {
      console.error(`Unable to instantiate module`, error);
      throw error;
    }
  }

  return {
    observeVFlight: () => {
      // the state.flight never gets reassigned, only mutated
      // so we need to subscribe to the state and not the selection array
      unFlight = subscribe(state.flight, async () => {
        const { arrival, departure } = state.flight;
        if (departure && arrival) {
          const inverse = arrival.lng > departure.lng;
          return await animateRoute({
            L,
            map,
            group,
            departure,
            arrival,
            inverse,
          });
        }
      });
    },
    handleFlight: async (departure, arrival) => {
      const [latD, lngD] = departure;
      const [latA, lngA] = arrival;
      const inverse = lngA > lngD;
      return await animateRoute({
        L,
        map,
        group,
        departure: { lat: latD, lng: lngD },
        arrival: { lat: latA, lng: lngA },
        inverse,
      });
    },
    cleanup: () => {
      if (currentAnimationInterval) {
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
      if (unFlight) {
        unFlight();
        unFlight = null;
      }
      group.clearLayers();
      // console.log("unsubscribed from flight and clearLayers");
    },
  };
}

export function createSelectionObserver({ L, group, userID, _this }) {
  const markersMap = new Map();
  const processedInputs = new Set(); // Track processed inputs
  let isProcessingBroadcast = false;
  let unsubscribeSelection = null;
  let unsubscribeDeletion = null;

  unsubscribeDeletion = subscribe(state.deletionState, () => {
    if (state.deletionState.isDeleted) {
      // Clear all map layers
      group.clearLayers();
      markersMap.clear();
      state.selection.clear();
      processedInputs.clear();
      state.flight.departure = null;
      state.flight.arrival = null;

      // Reset deletion state after handling
      state.deletionState.isDeleted = false;
    }
  });

  return {
    observeVSelections: () => {
      // console.log("observe selection", new Error().stack);
      if (unsubscribeSelection) unsubscribeSelection();
      // the state.Selection never gets reassigned, only mutated
      // so we need to subscribe to the state
      unsubscribeSelection = subscribe(state.selection, () => {
        if (isProcessingBroadcast) return; // prevent race condition & infinite loop
        state.selection.forEach((selection) => {
          const { lat, lng, inputType, userID: selectionUserID } = selection;
          // Prevent duplicate processing
          const inputKey = `${selectionUserID}-${inputType}`;
          if (processedInputs.has(inputKey)) return;

          if (userID === selectionUserID && _this) {
            isProcessingBroadcast = true;
            _this.pushEvent("add", selection);
            processedInputs.add(inputKey);
            isProcessingBroadcast = false;
          }

          const marker = L.marker(L.latLng({ lat, lng }), {
            type: inputType,
          });

          marker.addTo(group);
          markersMap.set(inputType, marker);
        });
      });
    },
    cleanup: () => {
      if (unsubscribeSelection) unsubscribeSelection();
      if (unsubscribeDeletion) unsubscribeDeletion();
      markersMap.clear();
      group.clearLayers();
      // console.log("unsubscribed from selection and deletion and markersMap");
    },
  };
}
