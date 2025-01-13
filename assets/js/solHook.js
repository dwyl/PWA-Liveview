import { createEffect } from "solid-js";
import { SolidComp } from "./SolidComp";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("stock destroyed-----");
  },
  async mounted() {
    console.log("liveSocket", window.liveSocket?.isConnected());

    let isHandlingServerUpdate = false,
      userID = null;

    this.handleEvent("store", ({ key, data }) => {
      sessionStorage.setItem(key, data);
    });

    this.handleEvent("restore", ({ key, event }) => {
      const data = sessionStorage.getItem(key);
      if (data) {
        this.pushEvent(event, data);
      }
    });

    this.handleEvent("clear", ({ key }) => {
      sessionStorage.removeItem(key);
    });

    const stockMap = ydoc.getMap("stock");

    this.handleEvent("user", ({ user_id, global_stock, max }) => {
      userID = String(user_id);
      sessionStorage.setItem("userID", userID);
      sessionStorage.setItem("max", max);
      if (!stockMap.has("globalStock")) {
        stockMap.set("globalStock", { c: Number(global_stock) });
      }

      SolidComp({ ydoc, userID, max, el: this.el });
    });

    this.pushEvent("stock", {
      user_id: sessionStorage.getItem("userID"),
      c: stockMap.get("globalStock").c,
    });

    this.handleEvent("new_stock", async ({ c }) => {
      isHandlingServerUpdate = true;
      try {
        const stockMap = ydoc.getMap("stock");

        stockMap.set("globalStock", { c });
        // Update stored state
        // const stateData = JSON.stringify({
        //   userID: sessionStorage.getItem("userID"),
        //   max: sessionStorage.getItem("max"),
        //   global_stock: c,
        // });
        // sessionStorage.setItem("lv_stock_state", stateData);
      } finally {
        isHandlingServerUpdate = false;
      }
    });

    const _this = this;

    createEffect(() => {
      stockMap.observe((event) => {
        console.log(event.changes);
        if (isHandlingServerUpdate) return;
        const globalStock = stockMap.get("globalStock");
        if (globalStock) {
          // window.liveSocket.getSocket().onOpen(() => {
          this.pushEvent("stock", {
            user_id: sessionStorage.getItem("userID"),
            c: globalStock.c,
            // });
          });
          // Push to LiveView only if change originated from current user
          // This prevents broadcast loops

          // if (window.liveSocket?.isConnected()) {
          // }
        }
      });
    });
  },
});
