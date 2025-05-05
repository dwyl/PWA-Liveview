import "leaflet/dist/leaflet.css";

export async function initMap() {
  const { default: L } = await import("leaflet");
  const { MaptilerLayer, MapStyle } = await import(
    "@maptiler/leaflet-maptilersdk"
  );
  const map = L.map("map", {
    renderer: L.canvas(),
    minzoom: 1,
    maxzoom: 10,
    referrerPolicy: "origin",
  });

  map.setView([0, 0], 0);
  const maptLayer = new MaptilerLayer({
    apiKey: import.meta.env.VITE_API_KEY,
    crossOrigin: "anonymous", // make a CROS request without crendentials
    style: MapStyle.STREETS,
  });
  maptLayer.addTo(map);

  const group = L.layerGroup().addTo(map);

  L.Icon.Default.imagePath = "assets/";
  return { L, map, group, maptLayer };
}
