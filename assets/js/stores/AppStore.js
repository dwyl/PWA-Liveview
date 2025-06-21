import { createStore } from "solid-js/store";

export const [appState, setAppState] = createStore({
  status: "online",
  isOnline: true,
  interval: null,
  globalYdoc: null,
  userSocket: null,
  userToken: null,
  hooks: null,
  CONFIG: {
    POLL_INTERVAL: 1_000,
    ICONS: {
      online: new URL("@assets/online.svg", import.meta.url).href,
      offline: new URL("@assets/offline.svg", import.meta.url).href,
    },
    PAGES_CACHE: "page-shells",
    NAVIDS: {
      yjs: { path: "/yjs", id: "users-yjs" },
      map: { path: "/map", id: "users-map" },
      elec: { path: "/sync", id: "users-elec" },
    },
    CONTENT_SELECTOR: "#main-content",
    MapID: "hook-map",
    hooks: {
      PgStockHook: "hook-pg",
      StockYjsChHook: "hook-yjs-sql3",
      MapHook: "hook-map",
      FormHook: "hook-select-form",
    },
  },
});
