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

async function wasm() {
  const { memory, computeGreatCirclePoints, getBufferSize, memfree } =
    await loadWasm();

  const { default: L } = await import("leaflet");

  // const mq = L.tileLayer(
  //   "http://oatile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg",
  //   {
  //     attribution:
  //       'Tiles Courtesy of <a href="http://www.mapquest.com/">MapQuest</a> &mdash; Portions Courtesy NASA/JPL-Caltech and U.S. Depart. of Agriculture, Farm Service Agency',
  //     subdomains: "1234",
  //     maxZoom: 11,
  //   }
  // );
  const osmTiles = L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }
  );

  const map = L.map("map");
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

  const bounds = L.latLngBounds(cdg, ny);
  map.fitBounds(bounds);

  const ptr = computeGreatCirclePoints(lat1, lon1, lat2, lon2);
  const size = getBufferSize();
  const points = new Float64Array(memory.buffer, ptr, size / 8);

  const cp = Array.from(points);
  console.log("res", size, ptr);
  // Convert to array of LatLng points for Leaflet
  const latLngs = [];
  for (let i = 0; i < cp.length; i += 2) {
    latLngs.push(L.latLng(cp[i], cp[i + 1]));
  }
  console.log(latLngs);
  // Create the animated marker
  L.polyline(latLngs).addTo(map);

  memfree(ptr, size);
  // const animatedMarker = L.animatedMarker(line.getLatLngs(), {
  //   distance: 200, // meters
  //   interval: 2000, // milliseconds
  // });

  // map.addLayer(animatedMarker);
  // */
}

export const MapHook = {
  async mounted() {
    await wasm();
    // Load the WASM module
  },
};
