import "leaflet/dist/leaflet.css";
// import wasm from "./zig_gc.wasm?url";

async function loadWasm() {
  try {
    const importObject = {
      env: {
        memory: new WebAssembly.Memory({ initial: 20 }),
        consoleLog: function (ptr, len) {
          const memory = instance.exports.memory;
          const bytes = new Uint8Array(memory.buffer, ptr, len);
          const string = new TextDecoder().decode(bytes);
          console.log(string);
        },
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

async function computeRoute() {
  try {
    const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
      await loadWasm();

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

    const lat1 = 48.88; // San Francisco
    const lon1 = 2.3;
    const lat2 = 40.7128; // New York
    const lon2 = -74.006;
    const cdg = L.latLng(lat1, lon1);
    const ny = L.latLng(lat2, lon2);

    L.marker(cdg).addTo(map);
    L.marker(ny).addTo(map);

    const bounds = L.latLngBounds(ny, cdg);
    map.fitBounds(bounds);

    const ptr = computeGreatCirclePoints(lat1, lon1, lat2, lon2);
    const size = getBufferSize();
    const greatCircle = new Float64Array(memory.buffer, ptr, size / 8);

    // Convert to array of LatLng points for Leaflet
    const latLngs = [];
    for (let i = 0; i < greatCircle.length; i += 2) {
      latLngs.push(L.latLng(greatCircle[i], greatCircle[i + 1]));
    }
    memfree(ptr, size);

    // create a marker: the plane icon that will move along the path
    const marker = L.marker(latLngs[0], {
      icon: new L.Icon({
        iconUrl: "/images/airplane.svg",
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      }),
    });
    marker.addTo(map);

    // Create the animated marker
    const rendered = L.canvas();
    // draw the great circle path
    L.polyline(latLngs, { renderer: rendered }).addTo(map);
    return animatePlan(marker, latLngs, 500);
  } catch (error) {
    console.error(`Unable to instantiate module`, error);
    throw error;
  }
}

function move(marker, latLngs, idx) {
  marker.setLatLng(latLngs[idx]);
}

function animatePlan(marker, latLngs, time) {
  let idx = 0;
  let countID = null;
  countID = setInterval(() => {
    if (idx >= latLngs.length - 1) {
      clearInterval(countID);
    }
    move(marker, latLngs, idx);
    idx++;
  }, time);
  return countID;
}

export async function RenderMap() {
  const countID = await computeRoute();
}

export const MapHook = {
  countId: null,
  destroyed() {
    clearInterval(this.countId);
    this.countId = null;
    console.warn("map destroyed");
  },
  async mounted() {
    try {
      this.countId = await computeRoute();
      console.log(this.countId);
    } catch (error) {
      console.error(`Unable to run the map`, error);
      throw error;
    }
  },
  reconnected() {
    console.log("Reconnection detected");
    this.mounted();
  },
};

// const mq = L.tileLayer(
//   "http://oatile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg",
//   {
//     attribution:
//       'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
//     subdomains: "1234",
//     maxZoom: 11,
//   }
// );
