import { checkServer } from "@js/utilities/checkServer";
import { appState } from "@js/stores/AppStore.js";

export const StockYjsChHook = ({ ydoc }) => ({
  isOnline: false,
  status: "offline",
  channel: null,
  userID: null,
  max: null,
  stockComponent: null,
  cleanupSolid: null,
  topic: "sql3-counter",

  async mounted() {
    this.userID = Number(this.el.dataset.userid);
    if (!localStorage.getItem("userID")) {
      localStorage.setItem("userID", this.userID);
    }
    this.max = Number(this.el.dataset.max);
    if (!localStorage.getItem("max")) {
      localStorage.setItem("max", this.max);
    }

    this.ymap = ydoc.getMap("sql3-data");

    this.stockComponent = this.stockComponent.bind(this);
    this.cleanupSolid = await this.stockComponent();

    this.setupChannel = this.setupChannel.bind(this);
    window.addEventListener("user-socket-ready", this.setupChannel);
    if (appState.userSocket) {
      this.setupChannel();
    }

    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);

    console.log("[StockYjsCh] mounted");
  },

  async stockComponent() {
    const { YjsStock } = await import("@jsx/components/yjsStock");
    return YjsStock({
      el: this.el,
      userID: this.userID,
      max: this.max,
      ydoc,
      inv: false, // inverse style
    });
  },

  async setupChannel() {
    const { useChannel } = await import("@js/user_socket/useChannel");
    const userSocket = appState.userSocket;
    this.channel = await useChannel(userSocket, this.topic, {
      userID: this.userID,
      max: this.max,
    });

    if (this.channel.state === "joined") {
      this.syncWithServer();

      // Remote updates from server, update local doc and reset clicks
      this.channel.on("counter-update", ({ counter, from }) => {
        if (from === this.userID) return; // ignore own updates
        ydoc.transact(() => {
          this.ymap.set("counter", counter);
          // do not reset clicks here, only in handleYUpdate
          // as they may contain pending local state
        }, "remote");
      });
      // local updates from the client, push to server
      ydoc.on("update", this.handleYUpdate);
    }
  },

  // ydoc.'on':  listens to all YDoc changes
  async handleYUpdate(update, origin) {
    console.log("[handleYUpdate]");
    // accept only local updates and ignore remote ones or init
    if (origin == "local") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        const clicks = this.ymap.get("clicks") || 0;
        if (clicks > 0) {
          return this.channel
            .push("client-update", { clicks, from: this.userID })
            .receive("ok", ({ _counter }) => {
              ydoc.transact(() => {
                this.ymap.set("clicks", 0);
              }, "local");
            });
        }
      }
    }
  },

  // On (re)connect, fetch "canonical" counter
  syncWithServer() {
    if (!this.channel) return;
    console.log("[syncWithServer]");

    const clicks = this.ymap.get("clicks") || 0;
    const payload = {
      from: this.userID,
      ...(clicks > 0 ? { clicks } : {}),
    };
    return this.channel
      .push("client-update", payload)
      .receive("ok", ({ counter }) => {
        ydoc.transact(() => {
          this.ymap.set("counter", counter);
          this.ymap.set("clicks", 0);
        }, "init");
      });
  },

  destroyed() {
    if (ydoc) {
      ydoc.off("update", this.handleYUpdate);
    }

    window.removeEventListener("user-socket-ready", this.setupChannel);

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    console.log("[StockYjsChHook] destroyed");
  },
});
