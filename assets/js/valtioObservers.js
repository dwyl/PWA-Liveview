import state from "./vStore.js";
import { subscribe } from "valtio/vanilla";

export async function createFlightObserver({ L, map, group }) {
  let currentAnimationInterval = null;
  async function loadWasm() {
    try {
      const importObject = {
        env: {
          memory: new WebAssembly.Memory({ initial: 20 }),
          // consoleLog: function (ptr, len) {
          //   const memory = instance.exports.memory;
          //   const bytes = new Uint8Array(memory.buffer, ptr, len);
          //   const string = new TextDecoder().decode(bytes);
          //   console.log(string);
          // },
        },
      };

      const { instance } = await WebAssembly.instantiateStreaming(
        fetch("./assets/great_circle.wasm"),
        importObject
      );
      return instance.exports;
    } catch (error) {
      console.error(`Unable to instantiate the module`, error);
      return {
        computeGreatCirclePoints: () => [],
      };
    }
  }
  async function computeGreatCircle({ L, group, departure, arrival }) {
    const { lat: latA, lng: lngA } = arrival;
    const { lat: latD, lng: lngD } = departure;
    try {
      const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
        await loadWasm();
      console.log("loadWasm");
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
  function animate({ L, group, latLngs }, animationTime = 200) {
    if (currentAnimationInterval) {
      clearInterval(currentAnimationInterval);
      currentAnimationInterval = null;
    }

    const marker = L.marker(latLngs[0], {
      icon: new L.Icon({
        iconUrl: "/images/airplane.svg",
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      }),
    });
    marker.addTo(group);

    let idx = 0;
    return new Promise((resolve) => {
      const currentAnimationInterval = setInterval(() => {
        if (idx >= latLngs.length - 1) {
          clearInterval(currentAnimationInterval);
          resolve();
        }
        marker.setLatLng(latLngs[idx]);
        idx++;
      }, animationTime);
    });
  }
  async function animateRoute({ L, map, group, departure, arrival }) {
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

      animate({ L, group, latLngs }, 200);
      clearInterval(currentAnimationInterval);
    } catch (error) {
      console.error(`Unable to instantiate module`, error);
      throw error;
    }
  }

  return {
    observeVFlight: () => {
      subscribe(state.flight, () => {
        const { arrival, departure } = state.flight;
        if (departure && arrival) {
          animateRoute({ L, map, group, departure, arrival });
        }
      });
    },
    handleFlight: (departure, arrival) => {
      const [latD, lngD] = departure;
      const [latA, lngA] = arrival;
      animateRoute({
        L,
        map,
        group,
        departure: { lat: latD, lng: lngD },
        arrival: { lat: latA, lng: lngA },
      });
    },
  };
}

export function createSelectionObserver({ L, group, userID, _this }) {
  const markersMap = new Map();
  const processedInputs = new Set(); // Track processed inputs
  let isProcessingBroadcast = false;

  subscribe(state.deletionState, () => {
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
      subscribe(state.selection, () => {
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
  };
}
