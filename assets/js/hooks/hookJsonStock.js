import { checkServer } from "@js/utilities/checkServer";

export const StockJsonHook = ({ ydoc, userSocket }) => ({
  isOnline: false,
  status: "offline",
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
    console.log(this.max);

    this.stockComponent = this.stockComponent.bind(this);
    this.cleanupSolid = await this.stockComponent();

    this.setupChannel = this.setupChannel.bind(this);
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);

    await this.setupChannel(userSocket, "counter").then(() =>
      this.syncWithServer()
    );

    window.addEventListener("connection-status-changed", ({ detail }) => {
      console.log("connection-status-changed", detail.status);
      if (detail.status === "online") {
        this.status = "online";
        this.syncWithServer();
      } else {
        this.status = "offline";
      }
    });

    // Listen to local yjs updates (component will update clicks/counter)
    ydoc.on("update", this.handleYUpdate);
  },

  destroyed() {
    if (ydoc) ydoc.off("update", this.handleYUpdate);

    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    console.log("[StockJsonHook] destroyed");
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

  async setupChannel(userSocket, topic) {
    const { useChannel } = await import("@js/user_socket/useChannel");
    this.channel = await useChannel(userSocket, topic, {
      userID: this.userID,
      max: this.max,
    });

    // Receive new counter from server, update local doc and reset clicks
    this.channel.on("counter-update", ({ counter, from }) => {
      if (from === this.userID) return; // ignore own updates
      console.log(this.userID, "counter-udpate", counter, from);
      const ymap = ydoc.getMap("data");
      ydoc.transact(() => {
        ymap.set("counter", counter);
        ymap.set("clicks", 0);
      }, this.userID);
    });

    return this.channel.state;
  },

  // 'on'  local change, send only the clicks delta to the server
  async handleYUpdate(update, origin) {
    if (origin == "local" && origin !== "init") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        const ymap = ydoc.getMap("data");
        const clicks = ymap.get("clicks") || 0;
        if (clicks > 0) {
          return this.channel
            .push("client-update", { clicks })
            .receive("ok", () => {
              ydoc.transact(() => {
                ymap.set("clicks", 0);
              }, this.userID); // reset clicks to 0
              // counter will be updated by "counter-update" handler
              // clicks always reset to 0 in the handler
            });
        }
      }
    }
  },

  // On (re)connect, fetch canonical counter
  syncWithServer() {
    if (!this.channel) return;
    const ymap = ydoc.getMap("data");
    const clicks = ymap.get("clicks") || 0;
    const payload = clicks > 0 ? { clicks } : {};
    return this.channel
      .push("init-client", payload)
      .receive("ok", ({ counter }) => {
        ydoc.transact(() => {
          ymap.set("counter", counter);
          ymap.set("clicks", 0);
        }, "init");
      });
  },
});
