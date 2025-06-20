import { appState } from "@js/stores/AppStore";

export const PgStockHook = ({ ydoc }) => ({
  ymap: null,
  channel: null,
  topic: "pg-counter",

  async mounted() {
    console.log("[PgStockHook] mounting...");
    this.userID = Number(this.el.dataset.userid);
    if (!localStorage.getItem("userID")) {
      localStorage.setItem("userID", this.userID);
    }

    this.max = Number(this.el.dataset.max);
    if (!localStorage.getItem("max")) {
      localStorage.setItem("max", this.max);
    }

    this.ymap = ydoc.getMap("pg-data");

    // 'online' mode: from the LV, received reply from handle_event "dec"
    this.handleEvent("update-local-store", ({ counter }) => {
      console.log("update-local-store", counter);

      this.ymap.set("pg-count", counter);
    });

    this.pushClicks = this.pushClicks.bind(this);
    this.setupChannel = this.setupChannel.bind(this);

    window.addEventListener("user-socket-ready", this.setupChannel);
    if (appState.userSocket) {
      this.setupChannel();
    }

    console.log("[PgStockHook] mounted");
  },

  // 'online' mode: using Channel
  pushClicks() {
    console.log("[pushClicks]", this.ymap.get("clicks"), this.channel.state);
    this.channel &&
      this.channel
        .push("client-clicks", {
          clicks: Number(this.ymap.get("clicks")) || 0,
        })
        .receive("ok", ({ new_val }) => {
          this.ymap.set("clicks", 0);
          this.ymap.set("pg-count", new_val);
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
      this.pushClicks();
    }
  },

  destroyed() {
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }

    window.removeEventListener("user-socket-ready", this.setupChannel);

    console.log("[PgStockHook] destroyed");
  },
});
