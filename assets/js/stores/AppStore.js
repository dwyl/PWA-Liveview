import { createStore } from "solid-js/store";

export const [appState, setAppState] = createStore({
  status: "offline",
  isOnline: false,
  interval: null,
  globalYdoc: null,
  userSocket: null,
  userToken: null,
  hooks: null,
});
