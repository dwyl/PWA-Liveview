import { checkServer } from "@js/utilities/checkServer";

export const PgStockHook = ({ ydoc, userSocket }) => ({
  async mounted() {
    this.userID = Number(this.el.dataset.userid);
    if (!localStorage.getItem("userID")) {
      localStorage.setItem("userID", this.userID);
    }

    this.max = Number(this.el.dataset.max);
    if (!localStorage.getItem("max")) {
      localStorage.setItem("max", this.max);
    }

    this.ymap = ydoc.getMap("pg-data");

    // received reply from handle_event "dec"
    this.handleEvent("update-local-store", ({ counter }) => {
      this.ymap.set("pg-count", counter);
    });

    this.pushClicks = this.pushClicks.bind(this);
    this.actionPushClicks = this.actionPushClicks.bind(this);
    this.setupChannel = this.setupChannel.bind(this);

    await this.setupChannel(userSocket, "pg-counter").then(() =>
      this.pushClicks()
    );

    // listener needs to be cleaned up in "destroyed"
    window.addEventListener("connection-status-changed", this.actionPushClicks);
  },
  async actionPushClicks(e) {
    console.log(e.detail.status);
    const channelJoined = await this.setupChannel(userSocket, "pg-counter");

    if (channelJoined === "joined") {
      this.channel
        .push("client-clicks", {
          clicks: Number(this.ymap.get("clicks")) || 0,
        })
        .receive("ok", (msg) => {
          this.ymap.set("clicks", 0);
          this.ymap.set("pg-count", msg.new_val);
        });
    }
  },
  pushClicks() {
    console.log(
      "pushEvent client-clicks",
      Number(this.ymap.get("clicks") || 0)
    );
    this.pushEvent(
      "client-clicks",
      { clicks: Number(this.ymap.get("clicks")) || 0 },
      (msg) => {
        console.log("channel reply", msg);
        this.ymap.set("click", 0);
        this.ymap.set("pg-count", msg?.new_val);
      }
    );
  },

  async setupChannel(userSocket, topic) {
    const { useChannel } = await import("@js/user_socket/useChannel");
    this.channel = await useChannel(userSocket, topic, {
      userID: this.userID,
      max: this.max,
    });

    return this.channel.state;
  },

  // async stockComponent() {
  //   const { PgStock } = await import("@js/components/pgStock");
  //   return PgStock({ max: this.max, userID: this.userID, el: this.el, ydoc });
  // },
  destroyed() {
    // if (this.cleanupSolid) {
    //   console.log("[PG] cleanupSolid+++++++");
    //   this.cleanupSolid();
    //   this.cleanupSolid = null;
    // }
    window.removeEventListener(
      "connection-status-changed",
      this.actionPushClicks
    );
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    console.log("[PgStockHook] destroyed");
  },
});
