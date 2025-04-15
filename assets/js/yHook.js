import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";
import { checkServer } from "./appV";

function decodeBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function encodeBase64(buf) {
  return btoa(String.fromCharCode(...buf));
}

function mergeWithLowestWins(ydoc, serverValue, serverState) {
  const localMap = ydoc.getMap("stock");
  const localValue = localMap.get("stock-value") ?? Infinity;

  console.log(localValue, serverValue);

  if (serverValue < localValue && serverState) {
    const decoded = decodeBase64(serverState);
    Y.applyUpdate(ydoc, decoded, "server");
  }
  // If local has a lower value, just ensure it's set
  else if (serverValue > localValue) {
    ydoc.transact(() => {
      localMap.set("stock-value", localValue);
    }, "lowest-wins");
    return true; // Indicates server needs updating
  }

  return false; // No server update needed
}

export const yHook = (ydoc) => ({
  destroyed() {
    // memoy leak prevention
    this.ydoc.off("update", this.handleYUpdate);
    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    console.log("yHook destroyed");
  },

  mounted() {
    console.log(
      "~~~~~~~~~~~>  YHook mounted",
      window.liveSocket?.socket?.isConnected()
    );
    this.currentUser = this.el.dataset.userid;
    sessionStorage.setItem("userID", this.currentUser);

    this.ymap = ydoc.getMap("stock");

    this.isOnline = null;
    this.pendingSync = false;
    this.ydoc = ydoc;
    this.cleanupSolid = null;
    this.reconnecting = false;

    // observe Y.js state changes
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.ydoc.on("update", this.handleYUpdate);

    // ---- Phoenix Event: Initial state from server ----
    this.handleEvent("init_stock", this.handleInitStock.bind(this));
    // ---- Phoenix Event: Sync state from server ----
    this.handleEvent("sync_from_server", this.handleSyncFromServer.bind(this));

    // ---- Yjs document updates ----
  },

  // Initializes state from the database or applies Y.js state
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
    } else {
      const needsServerUpdate = mergeWithLowestWins(
        ydoc,
        db_value,
        db_64_state
      );
      console.log(needsServerUpdate);
      if (needsServerUpdate) {
        const newValue = this.ymap.get("stock-value");
        this.pushStateToServer(newValue);
      }
    }

    this.cleanupSolid = SolidYComp({
      ydoc,
      max,
      el: this.el,
      userID: sessionStorage.getItem("userID"),
    });
  },
  // Handles Y.js document updates and syncs with the server
  async handleYUpdate(update, origin) {
    console.log(`handleYUpdate, ${this.currentUser}, origin: `, origin);

    if (origin === "server" || origin === "lowest-wins") {
      console.log(`Ignoring ${origin} update`);
      return;
    }

    this.isOnline = await checkServer();
    if (!this.isOnline) {
      console.log("Offline - will sync on reconnection");
      this.pendingSync = true;
      return;
    } else if (!this.reconnecting) {
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
      return this.pushStateToServer(value, this.currentUser);
    } else {
      console.log(
        `${this.currentUser} Received server-originated (${origin}) update of: `,
        value
      );
    }
  },

  async handleOnlineStatus() {
    if (this.pendingSync) {
      this.reconnecting = true;
      console.log("Reconnecting to server...");
      const isOnline = await checkServer();
      if (isOnline) {
        this.pendingSync = false;
        this.pushStateToServer(this.ymap.get("stock-value"));
        this.pendingSync = false;
      }
    }
    this.reconnecting = false;
  },

  // Applies server updates to the local Y.js document
  handleSyncFromServer({ value, state, sender }) {
    console.log(`handleSyncFromServer, ${this.currentUser}: `, sender);
    // merge state vector
    const needsServerUpdate = mergeWithLowestWins(ydoc, value, state);

    // If our value was lower, push it back to server
    if (needsServerUpdate && !this.reconnecting) {
      const newValue = this.ymap.get("stock-value");
      this.pushStateToServer(newValue);
    }
  },
  // Sends local state to the server
  pushStateToServer(value) {
    console.log(`syncStateToServer, ${this.currentUser}: `);
    const encoded = Y.encodeStateAsUpdate(ydoc);
    this.pushEvent("sync_state", {
      value,
      b64_state: encodeBase64(encoded),
      sender: this.currentUser,
    });
  },
});
