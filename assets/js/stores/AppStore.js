import { createStore } from "solid-js/store";

export const [appState, setAppState] = createStore({
  status: "offline",
  isOnline: true,
  interval: null,
  globalYdoc: null,
  userSocket: null,
  updateServiceWorker: null,
  userToken: null,
  hooks: null,
});
