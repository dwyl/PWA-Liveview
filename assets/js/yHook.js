import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";
import { checkServer } from "./appV";

export const yHook = (ydoc) => ({
  destroyed() {
    this.ydoc.off("update", this.yUpdateHandler);
    console.log("yHook destroyed");
  },

  mounted() {
    this.currentUser = this.el.dataset.userid;
    sessionStorage.setItem("userID", this.currentUser);
    this.ymap = ydoc.getMap("stock");

    this.isOnline = navigator.onLine;
    this.pendingSync = false;
    this.ydoc = ydoc;
    this.cleanupSolid = null;

    this.yUpdateHandler = this.yUpdateHandler.bind(this);
    this.ydoc.on("update", this.yUpdateHandler);

    // ---- Phoenix Event: Initial state from server ----
    this.handleEvent("init_stock", this.handleInitStock.bind(this));
    // ---- Phoenix Event: Sync state from server ----
    this.handleEvent("sync_stock", this.handleSyncStock.bind(this));
    // ---- Yjs document updates ----
    this.ydoc.on("update", this.yUpdateHandler.bind(this));
  },

  handleInitStock({ db_value, db_64_state, max }) {
    // defensive cleanup if "destroyed" was not called before
    if (this.cleanupSolid) {
      this.cleanupSolid?.(); // unmount previous instance
    }

    sessionStorage.setItem("max", max);

    if (this.ymap.get("stock-value") === undefined) {
      if (db_64_state && db_64_state.length > 0) {
        console.log("Initializing Y.js state from DB state vector");
        const decoded = Uint8Array.from(atob(db_64_state), (c) =>
          c.charCodeAt(0)
        );
        Y.applyUpdate(ydoc, decoded, "server");
      } else {
        console.log("No Y.js state in DB, initializing with raw DB value");
        this.ymap.set("stock-value", db_value);
      }
    }

    this.cleanupSolid = SolidYComp({
      ydoc,
      max,
      el: this.el,
      userID: sessionStorage.getItem("userID"),
    });
  },
  async yUpdateHandler(update, origin) {
    this.isOnline = await checkServer();
    const value = this.ymap.get("stock-value");
    console.log(
      `${this.currentUser} yHook: ydoc.on gets Y.js update: ${value}, origin: ${origin}`
    );
    if (origin === "server") {
      console.log("Received server-originated update:", value);
      if (!this.isOnline) {
        console.log("Offline - will sync on reconnection");
        this.pendingSync = true;
      }
    } else {
      this.syncStateToServer();
    }
  },

  handleSyncStock({ value, state, from }) {
    // merge state vector
    if (state?.length > 0) {
      const binary = Uint8Array.from(atob(state), (c) => c.charCodeAt(0));
      Y.applyUpdate(ydoc, binary, from);
    }

    // update local value
    if (value !== this.ymap.get("stock-value")) {
      ydoc.transact(() => {
        this.ymap.set("stock-value", value);
      }, "server");
    }
    // const currentValue = this.ymap.get("stock-value");
    // if (value !== currentValue) {
    //   console.log(`Updating local value from ${currentValue} to ${value}`);
    //   ydoc.transact(() => {
    //     this.ymap.set("stock-value", value);
    //   }, "server");
    // }
  },

  syncStateToServer() {
    const value = this.ymap.get("stock-value");
    console.log("Sending ", value, "to server");

    const encoded = Y.encodeStateAsUpdate(this.ydoc);
    const base64 = btoa(String.fromCharCode(...encoded));
    this.pushEvent("sync_state", {
      value,
      b64_state: base64,
    });
  },
  requestLatestState() {
    const value = this.ymap.get("stock-value");
    const encoded = Y.encodeStateAsUpdate(ydoc);
    const base64 = btoa(String.fromCharCode(...encoded));
    console.log("Requesting latest state from server:", value);

    console.log("Reconnection payload:", {
      value,
      b64_state: base64,
    });

    this.pushEvent("reconnect_sync", {
      value,
      b64_state: base64,
    });

    this.pendingSync = false;
  },
  // resyncToServer() {
  //   const update = Y.encodeStateAsUpdate(this.ydoc);
  //   const encoded = btoa(String.fromCharCode(...update));
  //   this.pushEvent("y-update", { update: encoded });
  // },
});
