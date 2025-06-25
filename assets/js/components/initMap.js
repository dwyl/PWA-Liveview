import markerIcon from "@assets/marker-icon.png?url";
import markerIcon2x from "@assets/marker-icon-2x.png?url";
import markerShadow from "@assets/marker-shadow.png?url";

export async function initMap(mapID) {
  await loadLeafletCSS();
  const { default: L } = await import("leaflet");
  const { MaptilerLayer } = await import("@maptiler/leaflet-maptilersdk");

  const map = L.map(mapID, {
    renderer: L.canvas(),
    minzoom: 1,
    maxzoom: 10,
    referrerPolicy: "origin",
  });

  map.setView([0, 0], 0);
  const maptLayer = new MaptilerLayer({
    apiKey: import.meta.env.VITE_API_KEY,
    crossOrigin: "anonymous",
    style: "https://api.maptiler.com/maps/streets-v2/style.json",
  });

  maptLayer.addTo(map);

  const group = L.layerGroup().addTo(map);

  L.Marker.prototype.options.icon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    // iconUrl: new URL("@assets/marker-icon.png", import.meta.url).href,
    // iconRetinaUrl: new URL("@assets/marker-icon-2x.png", import.meta.url).href,
    // shadowUrl: new URL("@assets/marker-shadow.png", import.meta.url).href,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  return { L, map, group, maptLayer };
}

async function loadLeafletCSS() {
  if (!document.getElementById("inline-leaflet-css")) {
    // Vite-specific: Dynamically inject Leaflet CSS with ?inline
    const css = await import("leaflet/dist/leaflet.css?inline");
    const style = document.createElement("style");
    style.setAttribute("id", "inline-leaflet-css");
    style.textContent = css.default;
    document.head.appendChild(style);
  }
}
