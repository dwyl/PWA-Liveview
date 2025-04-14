import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";
import { checkServer } from "./appV";

function decodeBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function encodeBase64(buf) {
  return btoa(String.fromCharCode(...buf));
}

// function mergeWithLowestWins(ydoc, serverUpdate) {
//   const tempDoc = new Y.Doc();
//   Y.applyUpdate(tempDoc, serverUpdate);

//   const localMap = ydoc.getMap("stock");
//   const remoteMap = tempDoc.getMap("stock");

//   const localValue = localMap.get("value") ?? Infinity;
//   const remoteValue = remoteMap.get("value") ?? Infinity;

//   const winner = Math.min(localValue, remoteValue);
//   localMap.set("value", winner);
// }

export const yHook = (ydoc) => ({
  destroyed() {
    // memoy leak prevention
    this.ydoc.off("update", this.handleYUpdate);
    // const ymap = this.ydoc?.getMap("stock");
    // if (ymap) ymap.unobserveDeep();
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

    // observe Y.js state changes
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.ydoc.on("update", this.handleYUpdate);

    // ---- Phoenix Event: Initial state from server ----
    this.handleEvent("init_stock", this.handleInitStock.bind(this));
    // ---- Phoenix Event: Sync state from server ----
    this.handleEvent("sync_from_server", this.handleSyncFromServer.bind(this));
    // ---- Yjs document updates ----
  },

  handleInitStock({ db_value, db_64_state, max }) {
    console.log(`handleInitStock ${this.currentUser}`);
    // defensive cleanup if "destroyed" was not called before
    if (this.cleanupSolid) {
      this.cleanupSolid?.(); // unmount previous instance
    }

    sessionStorage.setItem("max", max);
    const localValue = this.ymap.get("stock-value");

    if (localValue === undefined) {
      if (db_64_state && db_64_state.length > 0) {
        console.log(`Initializing Y.js state from DB state vector`);
        const decoded = decodeBase64(db_64_state);
        Y.applyUpdate(ydoc, decoded, "server");
      } else {
        console.log(
          `${this.currentUser} No Y.js state in DB, initializing with raw DB value`
        );
        ydoc.transact(() => {
          this.ymap.set("stock-value", db_value);
        }, "server");
      }
    } else if (localValue < db_value) {
      console.log("this.pushStateToServer", localValue);
      this.pushStateToServer(localValue);
    }

    this.cleanupSolid = SolidYComp({
      ydoc,
      max,
      el: this.el,
      userID: sessionStorage.getItem("userID"),
    });
  },
  async handleYUpdate(update, origin) {
    console.log(`handleYUpdate, ${this.currentUser}, origin: `, origin);

    this.isOnline = await checkServer();
    if (!this.isOnline) {
      console.log("Offline - will sync on reconnection");
      this.pendingSync = true;
      return;
    } else {
      console.log("Online - syncing with server");
      this.pendingSync = false;
    }

    const value = this.ymap.get("stock-value");
    // const encoded = Y.encodeStateAsUpdate(this.ydoc);
    console.log(
      `${this.currentUser} handleYUpdate: ydoc.on gets Y.js update: ${value}, origin: ${origin}`
    );

    if (origin == this.currentUser) {
      console.log(`${this.currentUser} Client pushes update to server`);
      this.pushStateToServer(value, this.currentUser);
    } else if (origin === "server") {
      console.log(
        `${this.currentUser} Received server-originated update: `,
        value
      );
      // this.syncClientStateFromServer();
    }
  },

  handleSyncFromServer({ value, state, sender }) {
    console.log(`handleSyncFromServer, ${this.currentUser}: `, sender);
    // merge state vector
    if (state?.length > 0) {
      const binary = decodeBase64(state);
      Y.applyUpdate(ydoc, binary, sender);
    }

    // update local value
    if (value !== this.ymap.get("stock-value")) {
      console.log(`Updating Yjs with ${value}`);
      ydoc.transact(() => {
        this.ymap.set("stock-value", value);
      }, "server");
    }
  },
  pushStateToServer(value) {
    console.log(`syncStateToServer, ${this.currentUser}: `);
    const encoded = Y.encodeStateAsUpdate(this.ydoc);
    this.pushEvent("sync_state", {
      value,
      b64_state: encodeBase64(encoded),
      sender: this.currentUser,
    });
  },
  syncClientStateFromServer() {
    console.log(`syncClientStateFomrServer, ${this.currentUser}: `);
  },
});
