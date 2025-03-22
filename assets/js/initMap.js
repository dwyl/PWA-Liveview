import "leaflet/dist/leaflet.css";

export async function initMap() {
  const { default: L } = await import("leaflet");
  const { MaptilerLayer } = await import("@maptiler/leaflet-maptilersdk");
  const map = L.map("map", {
    renderer: L.canvas(),
    minzoom: 0,
    maxzoom: 10,
    referrerPolicy: "origin",
  });
  map.setView([0, 0], 0);
  const mtLayer = new MaptilerLayer({
    apiKey: import.meta.env.VITE_API_KEY,
    crossOrigin: 'anonymous',
    fetchOptions: {
      mode: 'cors',
      credentials: 'omit'
    }
  });
  mtLayer.addTo(map);

  const group = L.layerGroup().addTo(map);

  L.Icon.Default.imagePath = "images/";
  return { L, map, group };
}
