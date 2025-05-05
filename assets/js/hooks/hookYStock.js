import * as Y from "yjs";
import { checkServer } from "@js/utilities/checkServer";

export const StockYHook = ({ ydoc, ydocSocket }) => ({
  isOnline: false,
  wasOffline: true,
  connectionCheckInterval: null,
  channel: null,
  userID: null,
  max: null,
  stockComponent: null,
  cleanupSolid: null,
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

    // start the state syncing process with the server
    this.connectionCheckInterval = setInterval(async () => {
      // this.wasOffline = this.isOnline;
      this.isOnline = await checkServer();
      console.log(
        "hook checkServer",
        this.wasOffline,
        this.isOnline,
        new Error().stack
      );

      // If we were offline and now we're online, sync with server
      if (this.wasOffline && this.isOnline) {
        this.wasOffline = false;
        return channelState == "joined" && this.syncWithServer();
      } else {
        clearInterval(this.connectionCheckInterval);
      }
    }, 500);

    // Sync local updates from the Stock component to the server
    ydoc.on("update", this.handleYUpdate);
  },

  destroyed() {
    // remove listener
    if (ydoc) {
      ydoc.off("update", this.handleYUpdate);
    }

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
      console.log("[Stock]~~~~~~>  cleanupSolid");
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

    // apply updates from the server
    this.channel.on("pub-update", (payload) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload), "remote");
    });

    return this.channel.state;
  },

  //  sync with server if local change and not initial load
  async handleYUpdate(update, origin) {
    console.log("handleYUpdate", origin, this.connectionCheckInterval);
    if (origin !== "remote" && origin !== "init") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        // Send update to server
        return this.channel
          .push("yjs-update", update.buffer)
          .receive("ok", () => {
            console.log("Successfully pushed to server");
          });
      }
    }
  },

  // fetch the server state when "init"
  syncWithServer() {
    if (!this.channel) return;

    // sync local state with server on init
    const update = Y.encodeStateAsUpdate(ydoc);
    console.log("[syncWithServer]--------", update.length);
    if (update.length == 2) {
      return this.channel.push("init-client", {}).receive("ok", () => {
        console.log("Successfully instantiated sync with server");
        clearInterval(this.connectionCheckInterval);
        this.connectionCheckInterval = null;
      });
    }

    return this.channel
      .push("yjs-update", update.buffer)
      .receive("ok", () => {
        console.log("Successfully synced with server");
      })
      .receive("error", (err) =>
        console.error("Failed to sync with server:", err)
      );
  },
});
