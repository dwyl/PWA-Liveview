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
    // this.handleServerState = this.handleServerState.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);

    const channelState = await this.setupChannel(ydocSocket);
    console.log("channel: ", channelState);

    this.connectionCheckInterval = setInterval(async () => {
      const wasOffline = this.isOnline;
      this.isOnline = await checkServer();

      // If we were offline and now we're online, sync with server
      if (!wasOffline && this.isOnline) {
        channelState == "joined" && this.syncWithServer();
      }
    }, 500);

    // Sync updates (local or via remote) -> Server
    ydoc.on("update", this.handleYUpdate);
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

    this.channel.on("pub-update", (payload) => {
      console.log("remote pub-update", payload);
      Y.applyUpdate(ydoc, new Uint8Array(payload), "remote");
    });

    this.channel.on("init", (payload) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload), "init");
    });

    return this.channel.state;
  },

  async handleYUpdate(update, origin) {
    console.log("handleYUpdate", origin);
    // Only sync with server if this is a local change (not from server)
    // and we're online
    if (origin !== "remote" && origin !== "init") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        // Send update to server
        this.channel.push("yjs-update", update.buffer);
      }
    }
  },

  syncWithServer() {
    if (!this.channel) return;

    // Get the current state and send it to server
    const update = Y.encodeStateAsUpdate(ydoc);
    console.log("[syncWithServer]--------", update.length);
    if (update.length == 2) {
      return this.channel.push("init-client", {});
    }

    this.channel
      .push("yjs-update", update.buffer)
      .receive("ok", () => {
        console.log("Successfully synced with server");
        clearInterval(this.connectionCheckInterval);
      })
      .receive("error", (err) =>
        console.error("Failed to sync with server:", err)
      );
  },
});
