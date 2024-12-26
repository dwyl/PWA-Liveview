import { VitePWA } from "vite-plugin-pwa";

export default {
  plugins: [VitePWA({ registerType: "autoUpdate" })],
};
