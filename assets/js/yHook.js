import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";

export const yHook = (ydoc) => ({
  destroyed() {
    console.log("yHook destroyed");
  },
  mounted() {
    this.currentUser = this.el.dataset.userid;
    // this.isReconnecting = false;
    this.ymap = ydoc.getMap("stock");

    // window.addEventListener("online", () => {
    //   console.log("hook online listener");
    //   this.handleReconnection();
    // });

    //  Handle initial state from server
    this.handleEvent("init_stock", ({ value, state, max }) => {
      try {
        sessionStorage.setItem("max", max);
        const localState = Y.encodeStateAsUpdate(ydoc);
        if (state && state.length > 0) {
          // Apply server state if exists
          Y.applyUpdate(ydoc, new Uint8Array(state));
        }
        // apply any local state
        Y.applyUpdate(ydoc, new Uint8Array(localState));

        // initialize the stock value if needed
        if (!this.ymap.has("stock-value")) {
          this.ymap.set("stock-value", value);

          // Send initial state back to server
          const initialState = Y.encodeStateAsUpdate(ydoc);
          this.pushEvent("sync_state", {
            value: value,
            state: Array.from(initialState), // Convert Uint8Array to regular array for JSON
          });
        }

        // display the stock component
        SolidYComp({
          ydoc,
          max,
          el: this.el,
          userID: sessionStorage.getItem("userID"),
        });

        this.syncStateToServer();
      } catch (error) {
        console.error("Init failed:", error);
      }
    });

    // Handle updates from server (remote)
    this.handleEvent("sync_stock", ({ value, state }) => {
      // if (state && !this.isReconnecting) {
      const serverState = new Uint8Array(state);
      Y.applyUpdate(ydoc, serverState, "server");
      const currentValue = this.ymap.get("stock-value");
      if (value < currentValue) {
        this.ymap.set("stock-value", value);
      }
      // }
    });

    // Listen for LOCAL Y.js updates
    ydoc.on("update", (update, origin) => {
      if (origin === "local" && navigator.onLine) {
        // This generates a binary state update
        const encodedState = Array.from(Y.encodeStateAsUpdate(ydoc));
        this.pushEvent("sync_state", {
          value: this.ymap.get("stock-value"),
          state: encodedState,
        });
      }
    });
  },
  syncStateToServer() {
    console.log("syncStateToServer");
    const encodedState = Array.from(Y.encodeStateAsUpdate(ydoc));
    this.pushEvent("sync_state", {
      value: this.ymap.get("stock-value"),
      state: encodedState,
    });
  },
  // async handleReconnection() {
  //   console.log("handleReconnection");
  //   this.isReconnecting = true;
  //   try {
  //     // Get current server state
  //     await this.pushEvent("get_current_state", {});
  //   } finally {
  //     this.isReconnecting = false;
  //   }
  // },
});
