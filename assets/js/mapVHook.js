// import "leaflet/dist/leaflet.css";
import state from "./vStore.js";
// import { subscribe } from "valtio/vanilla";

// export async function initMap() {
//   const { default: L } = await import("leaflet");
//   const { MaptilerLayer } = await import("@maptiler/leaflet-maptilersdk");
//   const map = L.map("map", {
//     renderer: L.canvas(),
//     minzoom: 0,
//     maxzoom: 10,
//     referrerPolicy: "origin",
//   });
//   map.setView([0, 0], 0);
//   const mtLayer = new MaptilerLayer({
//     apiKey: import.meta.env.VITE_API_KEY,
//   });
//   mtLayer.addTo(map);

//   const group = L.layerGroup().addTo(map);

//   L.Icon.Default.imagePath = "images/";
//   return { L, map, group };
// }

// export async function createFlightObserver({ L, map, group }) {
//   let currentAnimationInterval = null;
//   async function loadWasm() {
//     try {
//       const importObject = {
//         env: {
//           memory: new WebAssembly.Memory({ initial: 20 }),
//           // consoleLog: function (ptr, len) {
//           //   const memory = instance.exports.memory;
//           //   const bytes = new Uint8Array(memory.buffer, ptr, len);
//           //   const string = new TextDecoder().decode(bytes);
//           //   console.log(string);
//           // },
//         },
//       };

//       const { instance } = await WebAssembly.instantiateStreaming(
//         fetch("./assets/great_circle.wasm"),
//         importObject
//       );
//       return instance.exports;
//     } catch (error) {
//       console.error(`Unable to instantiate the module`, error);
//       throw error;
//     }
//   }
//   async function computeGreatCircle({ L, group, departure, arrival }) {
//     const { lat: latA, lng: lngA } = arrival;
//     const { lat: latD, lng: lngD } = departure;
//     try {
//       const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
//         await loadWasm();
//       console.log("loadWasm");
//       const ptr = computeGreatCirclePoints(latD, lngD, latA, lngA);
//       const size = getBufferSize();
//       const greatCircle = new Float64Array(memory.buffer, ptr, size / 8);

//       // Convert to array of LatLng points for Leaflet
//       const latLngs = [];
//       for (let i = 0; i < greatCircle.length; i += 2) {
//         latLngs.push(L.latLng(greatCircle[i], greatCircle[i + 1]));
//       }
//       memfree(ptr, size);
//       L.polyline(latLngs, { renderer: L.canvas() }).addTo(group);
//       return latLngs;
//     } catch (error) {
//       console.error("GreatCircle module error", error);
//       throw error;
//     }
//   }
//   function animate({ L, group, latLngs }, animationTime = 200) {
//     if (currentAnimationInterval) {
//       clearInterval(currentAnimationInterval);
//       currentAnimationInterval = null;
//     }

//     const marker = L.marker(latLngs[0], {
//       icon: new L.Icon({
//         iconUrl: "/images/airplane.svg",
//         iconSize: [20, 20],
//         iconAnchor: [10, 20],
//       }),
//     });
//     marker.addTo(group);

//     let idx = 0;
//     return new Promise((resolve) => {
//       const currentAnimationInterval = setInterval(() => {
//         if (idx >= latLngs.length - 1) {
//           clearInterval(currentAnimationInterval);
//           resolve();
//         }
//         marker.setLatLng(latLngs[idx]);
//         idx++;
//       }, animationTime);
//     });
//   }
//   async function animateRoute({ L, map, group, departure, arrival }) {
//     try {
//       const A = L.latLng(arrival);
//       const D = L.latLng(departure);
//       const bounds = L.latLngBounds(A, D);
//       map.fitBounds(bounds);

//       const latLngs = await computeGreatCircle({
//         L,
//         group,
//         departure,
//         arrival,
//       });

//       animate({ L, group, latLngs }, 200);
//       clearInterval(currentAnimationInterval);
//     } catch (error) {
//       console.error(`Unable to instantiate module`, error);
//       throw error;
//     }
//   }

//   return {
//     observeVFlight: () => {
//       subscribe(state.flight, () => {
//         const { arrival, departure } = state.flight;
//         if (departure && arrival) {
//           animateRoute({ L, map, group, departure, arrival });
//         }
//       });
//     },
//     handleFlight: (departure, arrival) => {
//       const [latD, lngD] = departure;
//       const [latA, lngA] = arrival;
//       animateRoute({
//         L,
//         map,
//         group,
//         departure: { lat: latD, lng: lngD },
//         arrival: { lat: latA, lng: lngA },
//       });
//     },
//   };
// }

// export function createSelectionObserver({ L, group, userID, _this }) {
//   const markersMap = new Map();
//   const processedInputs = new Set(); // Track processed inputs
//   let isProcessingBroadcast = false;
//   return {
//     observeVSelections: () => {
//       subscribe(state.selection, () => {
//         if (isProcessingBroadcast) return; // prevent race condition & infinite loop
//         if (state.selection.get("deleted")) {
//           console.log("subscribe get deleted", group);
//           group.clearLayers();
//           markersMap.clear();
//           state.selection.clear();
//           processedInputs.clear();
//           state.flight.departure = null;
//           state.flight.arrival = null;
//         } else {
//           state.selection.forEach((selection) => {
//             const { lat, lng, inputType, userID: selectionUserID } = selection;
//             // Prevent duplicate processing
//             const inputKey = `${selectionUserID}-${inputType}`;
//             if (processedInputs.has(inputKey)) return;

//             if (userID === selectionUserID && _this) {
//               console.log("pushEvent add");
//               isProcessingBroadcast = true;
//               _this.pushEvent("add", selection);
//               processedInputs.add(inputKey);
//               isProcessingBroadcast = false;
//             }

//             const marker = L.marker(L.latLng({ lat, lng }), {
//               type: inputType,
//             });

//             marker.addTo(group);
//             markersMap.set(inputType, marker);
//           });
//         }
//       });
//     },
//   };
// }

export const MapVHook = {
  map: null,
  destroyed() {
    state.selection.clear();
    if (this.map) {
      this.map.eachLayer((layer) => {
        this.map.removeLayer(layer);
      });
      console.log("Map destroyed-----");
    }
  },
  async mounted() {
    console.log("Map mounted---");
    try {
      const { initMap } = await import("./initMap.js");
      const { L, map, group } = await initMap();
      this.map = map;
      // const userID = sessionStorage.getItem("userID");
      this.userID = this.el.dataset.userid;

      // if (!userID) {
      //   window.location.href = "/";
      // }
      const params = { L, map, group, userID: this.userID, _this: this };
      const { createFlightObserver, createSelectionObserver } = await import(
        "./valtioObservers.js"
      );
      const selectionObserver = createSelectionObserver(params);
      const flightObserver = await createFlightObserver(params);

      // Valtio observers
      selectionObserver.observeVSelections();
      flightObserver.observeVFlight();

      this.handleEvent("do_fly", ({ from, departure, arrival }) => {
        if (from !== this.userID) {
          const departure_latLng = [departure.lat, departure.lng];
          const arrival_latLng = [arrival.lat, arrival.lng];
          console.log("do_fly");
          flightObserver.handleFlight(departure_latLng, arrival_latLng);
        }
      });
      // event from other user
      this.handleEvent("added_airport", (airport) => {
        if (
          airport.action === "added_airport" &&
          this.userID !== airport.userID
        ) {
          console.log("map added ");
          state.selection.set(airport.inputType, {
            ...airport,
            broadcasted: true,
          });
        }
      });
      this.handleEvent("delete_airports", (airport) => {
        console.log("deleted", airport);
        state.selection.set("deleted", airport);
      });
    } catch (error) {
      console.error(`Unable to run the map`, error);
      throw error;
    }
  },
};
