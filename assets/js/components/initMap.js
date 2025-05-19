import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

export async function initMap() {
  const { default: L } = await import("leaflet");
  const { MaptilerLayer } = await import("@maptiler/leaflet-maptilersdk");

  const map = L.map("map", {
    renderer: L.canvas(),
    minzoom: 1,
    maxzoom: 10,
    referrerPolicy: "origin",
  });

  map.setView([0, 0], 0);
  const maptLayer = new MaptilerLayer({
    apiKey: import.meta.env.VITE_API_KEY,
    crossOrigin: "anonymous",
    style: "https://api.maptiler.com/maps/streets/style.json",
  });

  maptLayer.addTo(map);

  const group = L.layerGroup().addTo(map);

  // L.Icon.Default.imagePath = "/";
  L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
  L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
  L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
  L.Icon.Default.imagePath = "";
  return { L, map, group, maptLayer };
}
