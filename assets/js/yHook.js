import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";
import { checkServer } from "./appV";

export const yHook = (ydoc) => ({
  destroyed() {
    console.log("yHook destroyed");
  },
  resyncToServer() {
    const update = Y.encodeStateAsUpdate(this.ydoc);
    const encoded = btoa(String.fromCharCode(...update));
    this.pushEvent("y-update", { update: encoded });
  },

  mounted() {
    this.currentUser = this.el.dataset.userid;
    sessionStorage.setItem("userID", this.currentUser);
    this.ymap = ydoc.getMap("stock");

    this.isOnline = navigator.onLine;
    this.pendingSync = false;
    this.ydoc = ydoc;

    // ---- Phoenix Event: Initial state from server ----
    this.handleEvent("init_stock", this.handleInitStock.bind(this));

    // ---- Phoenix Event: Sync state from server ----
    this.handleEvent("sync_stock", this.handleSyncStock.bind(this));

    // ---- Yjs document updates ----
    ydoc.on("update", async (update, origin) => {
      this.isOnline = await checkServer();
      const value = this.ymap.get("stock-value");
      console.log(`Y.js update: ${value}, origin: ${origin}, update:`, update);
      if (origin === "server") {
        console.log("Received server-originated update:", value);
      } else {
        if (this.isOnline) {
          console.log("in ydoc update", this.isOnline);
          this.syncStateToServer();
        } else {
          console.log("Offline - will sync on reconnection");
          this.pendingSync = true;
        }
      }
    });
  },
  requestLatestState() {
    const value = this.ymap.get("stock-value");
    const encoded = Y.encodeStateAsUpdate(ydoc);
    const base64 = btoa(String.fromCharCode(...encoded));
    console.log("Requesting latest state from server:", value);

    console.log("Reconnection payload:", {
      value,
      state: base64,
    });

    this.pushEvent("reconnect_sync", {
      value,
      state: base64,
    });

    this.pendingSync = false;
  },

  handleInitStock({ db_value, db_state, max }) {
    try {
      console.log("Init with DB value:", db_value);
      sessionStorage.setItem("max", max);

      const yjs_value = this.ymap.get("stock-value");
      console.log("Current Y.js value:", yjs_value);

      if (yjs_value === undefined && db_state?.length > 0) {
        console.log("No Y.js value found, setting from DB");
        // this.ymap.set("stock-value", db_value);
        const decoded = Uint8Array.from(atob(db_state), (c) => c.charCodeAt(0));
        Y.applyUpdate(ydoc, decoded, "server");
      }

      // if (db_state?.length > 0) {
      //   const decoded = Uint8Array.from(atob(db_state), (c) => c.charCodeAt(0));
      //   Y.applyUpdate(ydoc, decoded, "server");
      // }

      SolidYComp({
        ydoc,
        max,
        el: this.el,
        userID: sessionStorage.getItem("userID"),
      });
    } catch (error) {
      console.error("Init failed:", error);
    }
  },

  handleSyncStock({ value, state, from }) {
    console.log("Received sync from server:", value, from);

    if (state?.length > 0) {
      const binary = Uint8Array.from(atob(state), (c) => c.charCodeAt(0));
      Y.applyUpdate(ydoc, binary, "server");
    }

    const currentValue = this.ymap.get("stock-value");
    if (value !== currentValue) {
      console.log(`Updating local value from ${currentValue} to ${value}`);
      ydoc.transact(() => {
        this.ymap.set("stock-value", value);
      }, "server");
    }
  },

  syncStateToServer() {
    const value = this.ymap.get("stock-value");
    console.log("Syncing to server with value:", value);

    const encoded = Y.encodeStateAsUpdate(ydoc);
    const base64 = btoa(String.fromCharCode(...encoded));
    // const base64 = btoa(String.fromCharCode(...encoded));
    this.pushEvent("sync_state", {
      value,
      state: base64,
    });
  },
});
