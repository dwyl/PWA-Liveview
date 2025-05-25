import { checkServer } from "@js/utilities/checkServer";

export const StockYjsChHook = ({ ydoc, userSocket }) => ({
  isOnline: false,
  status: "offline",
  channel: null,
  userID: null,
  max: null,
  stockComponent: null,
  cleanupSolid: null,
  ymap: null,

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
    this.handleYUpdate = this.handleYUpdate.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);
    this.runSync = this.runSync.bind(this);

    await this.setupChannel(userSocket, "sql3-counter").then((msg) => {
      if (msg !== "joined") throw new Error("Channel setup failed");
      this.syncWithServer();
    });

    window.addEventListener("connection-status-changed", this.runSync);

    // Listen to yjs updates (component will update clicks/counter)
    ydoc.on("update", this.handleYUpdate);
  },

  runSync({ detail }) {
    if (detail.status === "online") {
      this.status = "online";
      this.syncWithServer();
    } else {
      this.status = "offline";
    }
  },

  destroyed() {
    if (ydoc) ydoc.off("update", this.handleYUpdate);
    window.removeEventListener("connection-status-changed", this.runSync);
    if (this.cleanupSolid) {
      this.cleanupSolid();
      this.cleanupSolid = null;
    }
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    console.log("[StocYjsChHook] destroyed");
  },

  async stockComponent() {
    const { YjsStock } = await import("@jsx/components/yjsStock");
    return YjsStock({
      el: this.el,
      userID: this.userID,
      max: this.max,
      ydoc,
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
      console.log("counter-udpate", counter);
      if (from === this.userID) return; // ignore own updates
      // console.log(ymap.toJSON());
      ydoc.transact(() => {
        this.ymap.set("counter", counter);
        // do not reset clicks here, only in handleYUpdate
        // as they may contain pending local state
      }, "remote");
    });

    return this.channel.state;
  },

  // ydoc.'on':  listens to all YDoc changes
  async handleYUpdate(update, origin) {
    // accept only local updates and ignore remote ones or init
    if (origin == "local") {
      this.isOnline = await checkServer();
      if (this.isOnline) {
        const clicks = this.ymap.get("clicks") || 0;
        if (clicks > 0) {
          return this.channel
            .push("client-update", { clicks, from: this.userID })
            .receive("ok", ({ counter }) => {
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
});
