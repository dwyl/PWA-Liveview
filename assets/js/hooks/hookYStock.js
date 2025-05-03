import * as Y from "yjs";
import { checkServer } from "@js/utilities/checkServer";

export const StockYHook = ({ ydoc, ydocSocket }) => ({
  async mounted() {
    this.userID = Number(this.el.dataset.userid);
    if (!localStorage.getItem("userID")) {
      localStorage.setItem("userID", this.userID);
    }
    this.max = Number(this.el.dataset.max);
    if (!sessionStorage.getItem("max")) {
      sessionStorage.setItem("max", this.max);
    }

    this.stockComponent = this.stockComponent.bind(this);
    this.cleanupSolid = await this.stockComponent();
    console.log("[StockYHook] ~~~~~~~~~~> mounted");

    this.setupChannel = this.setupChannel.bind(this);
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.handleServerState = this.handleServerState.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);

    const channelState = await this.setupChannel(ydocSocket);
    console.log("channel: ", channelState);

    // Sync updates (local or via remote) -> Server
    ydoc.on("update", this.handleYUpdate);

    this.connectionCheckInterval = setInterval(async () => {
      console.log(this.connectionCheckInterval);
      const wasOffline = this.isOnline;
      this.isOnline = await checkServer();

      // If we were offline and now we're online, sync with server
      if (!wasOffline && this.isOnline) {
        this.syncWithServer();
      }
    }, 1_000);
  },

  destroyed() {
    // remove listener
    if (ydoc) {
      ydoc.off("update", this.handleYUpdate);
    }
    // window.removeEventListener("connection-status-changed", this.doSync);

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
      console.log("[cleanupSolid]~~~~~~> Stock");
    }
    // cleanup channel
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    console.log("[StockYHook] ~~~~~~~~~~> destroyed");
  },
  async stockComponent() {
    const { Stock } = await import("@jsx/components/stock");
    return Stock({
      el: this.el,
      ydoc: ydoc,
      userID: this.userID,
      max: this.max,
    });
  },
  async setupChannel(ydocSocket) {
    const { useChannel } = await import("@js/ydoc_socket/useChannel");
    this.channel = await useChannel(ydocSocket, "yjs-state", {
      userID: this.userID,
      max: this.max,
    });

    // this.channel.on("init-yjs-state", this.handleInitYDoc);
    this.channel.on("init-yjs-state", this.handleServerState);

    this.channel.on("pub-update", (payload) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload), "remote");
    });

    // ydocChannel.on("conflict-resolution", this.handleConflictResolution);

    return this.channel.state;
  },

  async handleYUpdate(update, origin) {
    console.log("handleYUpdate", origin);
    // Only sync with server if this is a local change (not from server)
    // and we're online
    if (origin !== "remote" && origin !== "conflict-resolution") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        // Send update to server
        this.channel.push("yjs-update", update.buffer);
      }
    }
  },
  handleServerState(payload) {
    console.log("Received server state");

    // Get server state as binary
    const serverUpdate = new Uint8Array(payload);
    if (!serverUpdate.length) {
      console.log("Empty server state, keeping local state");
      return;
    }

    // Get current local value
    const ymap = ydoc.getMap("data");
    const localValue = ymap.get("counter");
    if (!localValue) {
      // No local value, just apply server state
      console.log("No local data, applying server state");
      Y.applyUpdate(ydoc, serverUpdate, "remote");
      return;
    }

    // We have both local and server data - need to reconcile
    console.log("Reconciling local and server state");

    // Create temporary doc to read server value without affecting local state
    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, serverUpdate);
    const tempMap = tempDoc.getMap("data");
    const serverValue = tempMap.get("counter");

    console.log("Local value:", localValue, "Server value:", serverValue);

    // Apply "lowest wins" strategy
    if (serverValue !== undefined && serverValue < localValue) {
      console.log("Server has lower value, applying:", serverValue);
      ydoc.transact(() => {
        ymap.set("counter", Number(serverValue)); // Ensure it's a number
      }, "conflict-resolution");
    } else {
      console.log(
        "Local value is lower or no server value, keeping local:",
        localValue
      );
      // Ensure server gets our lower value
      this.syncWithServer();
    }
  },
  syncWithServer() {
    if (!this.channel) return;

    // Get the current state and send it to server
    const update = Y.encodeStateAsUpdate(ydoc);
    console.log("[syncWithServer]--------");
    this.channel
      .push("yjs-update", update.buffer)
      .receive("ok", () => console.log("Successfully synced with server"))
      .receive("error", (err) =>
        console.error("Failed to sync with server:", err)
      );
    clearInterval(this.connectionCheckInterval);
  },
});
