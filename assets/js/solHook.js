import { createEffect } from "solid-js";
import { SolidComp } from "./SolidComp";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("stock destroyed-----");
  },
  async mounted() {
    console.log("Counter mounted---");
    console.log("liveSocket", window.liveSocket?.isConnected());

    let isHandlingServerUpdate = false,
      userID = null;
    const stockMap = ydoc.getMap("stock");

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

    this.handleEvent("user", ({ user_id, global_stock, max }) => {
      userID = String(user_id);
      sessionStorage.setItem("userID", userID);
      sessionStorage.setItem("max", max);
      if (!stockMap.has("globalStock")) {
        stockMap.set("globalStock", { c: Number(global_stock) });
      } else {
        this.pushEvent("yjs-stock", { c: stockMap.get("globalStock").c });
      }

      SolidComp({ ydoc, userID, max, el: this.el });
    });

    this.handleEvent("new_stock", async ({ c }) => {
      isHandlingServerUpdate = true;
      console.log("new stock");
      try {
        const stockMap = ydoc.getMap("stock");

        stockMap.set("globalStock", { c });
      } finally {
        isHandlingServerUpdate = false;
      }
    });

    const _this = this;

    // external change
    stockMap.observe((event) => {
      console.log("hook", event.changes);
      window.liveSocket.getSocket().onOpen(() => console.log("is open"));
      if (isHandlingServerUpdate) return;
      const globalStock = stockMap.get("globalStock");
      console.log("observe hook", globalStock);
      if (globalStock) {
        this.pushEvent("stock", {
          user_id: sessionStorage.getItem("userID"),
          c: globalStock.c,
        });
      }
    });
  },
});
