import "leaflet/dist/leaflet.css";

export async function initMap() {
  const { default: L } = await import("leaflet");
  const { MaptilerLayer } = await import("@maptiler/leaflet-maptilersdk");
  const map = L.map("map", {
    renderer: L.canvas(),
    minzoom: 0,
    maxzoom: 10,
    referrerPolicy: "origin",
    errorTileUrl: "images/404.png",
  });
  map.setView([0, 0], 0);
  const mtLayer = new MaptilerLayer({
    apiKey: import.meta.env.VITE_API_KEY,
  });
  mtLayer.addTo(map);

  const group = L.layerGroup().addTo(map);

  L.Icon.Default.imagePath = "images/";
  return { L, map, group };
}

async function createFlightObserver({ L, map, group }) {
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
      throw error;
    }
  }
  async function computeGreatCircle({ L, group, departure, arrival }) {
    const [latA, lngA] = arrival;
    const [latD, lngD] = departure;
    try {
      const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
        await loadWasm();
      const ptr = computeGreatCirclePoints(latD, lngD, latA, lngA);
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
    observeYjsFlight: (flightMap) => {
      flightMap.observe(() => {
        const { arrival, departure } = flightMap.get("flight");
        animateRoute({ L, map, group, departure, arrival });
      });
    },
    handleFlight: (departure, arrival) =>
      animateRoute({ L, map, group, departure, arrival }),
    clearRoute: () => {
      if (currentAnimationInterval) {
        clearInterval(currentAnimationInterval);
        currentAnimationInterval = null;
      }
      group.clearLayers();
    },
  };
}

function createSelectionObserver({ L, group, s, userID }) {
  const markersMap = new Map();

  return {
    // Online version using y.js
    observeYjsSelections: (selectionMap) => {
      selectionMap.observe(({ changes }) => {
        [...changes.keys.values()].forEach((change) => {
          if (change.action === "add" || change.action === "update") {
            const [inputType] = [...changes.keys.keys()];
            const newInput = selectionMap.get(inputType);
            const { lat, lng } = newInput;
            const marker = L.marker(L.latLng({ lat, lng }), {
              type: inputType,
            });

            if (userID == newInput.userID && s) {
              s.pushEvent("add", newInput);
            }
            marker.addTo(group);
            markersMap.set(inputType, marker);
          } else if (change.action === "delete") {
            group.clearLayers();
            markersMap.clear();
          }
        });
      });
    },
  };
}

export const mapHook = (ydoc) => ({
  map: null,
  selectionMap: null,
  destroyed() {
    this.selectionMap.clear();
    if (this.map) {
      this.map.eachLayer((layer) => {
        this.map.removeLayer(layer);
      });
      console.log("Map destroyed-----");
    }
  },
  async mounted() {
    try {
      const { L, map, group } = await initMap();
      this.map = map;
      const userID = sessionStorage.getItem("userID");
      if (!userID) {
        window.location.href = "/";
      }
      // const _this = this;
      const params = { L, map, group, s: this, userID };
      const selectionObserver = createSelectionObserver(params);
      const flightObserver = await createFlightObserver(params);
      // Y.js observers
      this.selectionMap = ydoc.getMap("selection");
      selectionObserver.observeYjsSelections(this.selectionMap);
      flightObserver.observeYjsFlight(ydoc.getMap("flight"));

      this.handleEvent("do_fly", ({ from, departure, arrival }) => {
        if (from !== userID) {
          const departure_latLng = [departure.lat, departure.lng];
          const arrival_latLng = [arrival.lat, arrival.lng];
          flightObserver.handleFlight(departure_latLng, arrival_latLng);
        }
      });
      this.handleEvent("added_airport", (airport) => {
        this.selectionMap.set(airport.inputType, airport);
      });
      this.handleEvent("deleted_airport", (airport) => {
        console.log("deleted_airport", airport);
        this.selectionMap.clear();
      });
    } catch (error) {
      console.error(`Unable to run the map`, error);
      throw error;
    }
  },
});

export async function RenderMap(ydoc) {
  const { L, map, group } = await initMap();
  const userID = sessionStorage.getItem("userID");
  const params = { L, map, group, s: null, userID };

  const selectionObserver = createSelectionObserver(params);
  const flightObserver = await createFlightObserver(params);
  // Y.js observers
  selectionObserver.observeYjsSelections(ydoc.getMap("selection"));
  flightObserver.observeYjsFlight(ydoc.getMap("flight"));
}
