import { SolidYComp } from "./SolidYComp";
import * as Y from "yjs";
import { checkServer } from "./appV";

function decodeBase64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function encodeBase64(buf) {
  return btoa(String.fromCharCode(...buf));
}

function mergeWithLowestWins(ydoc, serverValue, serverState, origin) {
  const localMap = ydoc.getMap("stock");
  const localValue = localMap.get("stock-value") ?? Infinity;

  console.log(localValue, serverValue);

  // Case 1: Update coming from another user via server
  if (origin === "server") {
    // If server has a lower value, accept it unconditionally
    if (serverValue < localValue) {
      console.log(
        `Server value ${serverValue} is lower than local ${localValue}, accepting server value`
      );
      if (serverState) {
        const decoded = decodeBase64(serverState);
        Y.applyUpdate(ydoc, decoded, "server");
      } else {
        // Fallback if no state is provided
        ydoc.transact(() => {
          localMap.set("stock-value", serverValue);
        }, "server");
      }
      return false; // No server update needed as we just accepted server's value
    }
    // If local is lower, we need to tell the server
    else if (localValue < serverValue) {
      console.log(
        `Local value ${localValue} is lower than server ${serverValue}, keeping local value`
      );
      return true; // Notify server of our lower value
    }
    // Values are equal, no action needed
    return false;
  } // Case 2: Local value check during initialization/reconnection
  else {
    // Determine the winner
    if (serverValue < localValue) {
      console.log(
        `Server value ${serverValue} is lower, applying server state`
      );
      if (serverState) {
        const decoded = decodeBase64(serverState);
        Y.applyUpdate(ydoc, decoded, "server");
      } else {
        ydoc.transact(() => {
          localMap.set("stock-value", serverValue);
        }, "server");
      }
      return false; // No need to update server
    } else if (localValue < serverValue) {
      console.log(
        `Local value ${localValue} is lower, keeping it and notifying server`
      );
      return true; // We need to update the server with our lower value
    }

    // Values are equal, no update needed
    return false;
  }
}

export const yHook = (ydoc) => ({
  destroyed() {
    // memoy leak prevention
    this.ydoc.off("update", this.handleYUpdate);
    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    clearInterval(this.connectionCheckInterval);
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
    this.lastConnectionStatus = false;

    checkServer().then((online) => {
      this.isOnline = online;
      this.lastConnectionStatus = online;
    });

    // Setup periodic connection check instead of relying on navigator.onLine
    this.connectionCheckInterval = setInterval(async () => {
      const online = await checkServer();

      // If status changed from offline to online
      if (online && !this.lastConnectionStatus && this.pendingSync) {
        this.handleReconnection();
      }

      this.lastConnectionStatus = online;
      this.isOnline = online;
    }, 1_000); // Check every 5 seconds

    // Initial connection check
    checkServer().then((online) => {
      this.isOnline = online;
      this.lastConnectionStatus = online;
    });

    // observe Y.js state changes
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.ydoc.on("update", this.handleYUpdate);

    // ---- Phoenix Event: Initial state from server ----
    this.handleEvent("init_stock", this.handleInitStock.bind(this));
    // ---- Phoenix Event: Sync state from server ----
    this.handleEvent("sync_from_server", this.handleSyncFromServer.bind(this));

    // ---- Yjs document updates ----
  },
  async handleReconnection() {
    if (!this.pendingSync) return;

    this.reconnecting = true;
    console.log("Reconnected - syncing with server");

    // Force a server sync to apply lowest-wins logic
    const value = this.ymap.get("stock-value");
    this.pushStateToServer(value, this.currentUser);
    this.pendingSync = false;

    this.reconnecting = false;
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
        db_64_state,
        "init"
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
      userID: this.currentUser,
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
        `${this.currentUser} does nothing as received server-originated (${origin}) update of: `,
        value
      );
    }
  },
  // Applies server updates to the local Y.js document
  handleSyncFromServer({ value, state, sender }) {
    console.log(`handleSyncFromServer, ${this.currentUser}: `, sender);
    // merge state vector
    const needsServerUpdate = mergeWithLowestWins(ydoc, value, state, "server");

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
