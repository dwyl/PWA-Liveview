import "leaflet/dist/leaflet.css";
// import wasm from "./zig_gc.wasm?url";

async function setupMap() {
  const { default: L } = await import("leaflet");

  const osmTiles = L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }
  );

  const map = L.map("map", {
    renderer: L.canvas(),
  });
  map.setView([0, 0], 1);
  osmTiles.addTo(map);

  L.Icon.Default.imagePath = "images/";
  return { L, map };
}

async function animateRoute({ L, map, departure, arrival }) {
  // let isHandlingServerUpdate = false;

  try {
    // const lat1 = 48.88; // Paris
    // const lon1 = 2.3;
    // const lat2 = 40.7128; // New York
    // const lon2 = -74.006;
    // const cdg = L.latLng(lat1, lon1);
    // const ny = L.latLng(lat2, lon2);

    const [latA, longA] = arrival;
    const [latD, longD] = departure;

    console.log(latA, longA, latD, longD);

    const A = L.latLng(arrival);
    const D = L.latLng(departure);
    // L.marker(cdg).addTo(map);
    // L.marker(ny).addTo(map);

    const bounds = L.latLngBounds(A, D);
    map.fitBounds(bounds);

    const { gc, latLngs } = await computeGreatCircle(
      L,
      map,
      latA,
      longA,
      latD,
      longD
    );

    return animate({ L, map, latLngs, gc }, 200);
  } catch (error) {
    console.error(`Unable to instantiate module`, error);
    throw error;
  }
}

async function computeGreatCircle(L, map, lat1, lon1, lat2, lon2) {
  try {
    const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
      await loadWasm();
    const ptr = computeGreatCirclePoints(lat1, lon1, lat2, lon2);
    const size = getBufferSize();
    const greatCircle = new Float64Array(memory.buffer, ptr, size / 8);

    // Convert to array of LatLng points for Leaflet
    const latLngs = [];
    for (let i = 0; i < greatCircle.length; i += 2) {
      latLngs.push(L.latLng(greatCircle[i], greatCircle[i + 1]));
    }
    memfree(ptr, size);
    const gc = L.polyline(latLngs, { renderer: L.canvas() }).addTo(map);
    return { gc, latLngs };
  } catch (error) {
    console.error("GreatCircle module error", error);
    throw error;
  }
}

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
      fetch("./assets/great_circle.wasm", importObject)
    );
    return instance.exports;
  } catch (error) {
    console.error(`Unable to instantiate module`, error);
    throw error;
  }
}

function animate({ L, map, latLngs, gc }, time) {
  const marker = L.marker(latLngs[0], {
    icon: new L.Icon({
      iconUrl: "/images/airplane.svg",
      iconSize: [20, 20],
      iconAnchor: [10, 20],
    }),
  });
  marker.addTo(map);

  let idx = 0;
  let countID = null;
  countID = setInterval(() => {
    if (idx >= latLngs.length - 1) {
      clearInterval(countID);
    }
    marker.setLatLng(latLngs[idx]);
    idx++;
  }, time);
  return { gc, countID };
}

export async function RenderMap({ ydoc, userID }) {
  const { L, map } = await setupMap();
  await animateRoute({ L, map, ydoc, userID });
}

function observeMarkers({ L, map, ydoc, markersMap }) {
  const selectionMap = ydoc.getMap("selection");

  selectionMap.observe(({ changes }) => {
    changes.keys.values().forEach((change) => {
      if (change.action == "add") {
        const [inputType] = [...changes.keys.keys()];
        const { latitude, longitude } = selectionMap.get(inputType);
        const marker = L.marker(L.latLng([latitude, longitude]));
        marker.addTo(map);
        markersMap.set(inputType, marker);
      } else if (change.action === "delete") {
        const { inputType } = change.oldValue;
        const markerToRemove = markersMap.get(inputType);
        map.removeLayer(markerToRemove);
        markersMap.delete(inputType);
      }
    });
  });

  return markersMap;
}

async function observeFlight({ ydoc, L, map }) {
  const flightMap = ydoc.getMap("flight");
  flightMap.observe(() => {
    const { arrival, departure } = [...flightMap.values()][0];
    return animateRoute({ L, map, departure, arrival });
  });
}

export const mapHook = (ydoc) => ({
  countId: null,
  // gc: null,
  // userID: null,
  markersMap: new Map(),
  destroyed() {
    console.warn("map destroyed");
    clearInterval(this.countId);
    this.countId = null;
    // this.gc = null;
    // this.userID = null;
  },
  async mounted() {
    try {
      const { L, map } = await setupMap();
      // const userID = sessionStorage.getItem("userID");

      // const { gc, countID } = await animateRoute({ L, map, ydoc, userID });
      // this.countId = countID;
      // this.gc = gc;
      // this.userID = userID;

      this.markersMap = observeMarkers({
        L,
        map,
        ydoc,
        markersMap: this.markersMap,
      });

      observeFlight({ ydoc, L, map });
    } catch (error) {
      console.error(`Unable to run the map`, error);
      throw error;
    }
  },
});

// const mq = L.tileLayer(
//   "http://oatile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg",
//   {
//     attribution:
//       'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
//     subdomains: "1234",
//     maxZoom: 11,
//   }
// );
