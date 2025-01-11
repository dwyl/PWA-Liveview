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

    this.handleEvent("user", ({ user_id, global_stock, max }) => {
      userID = String(user_id);

      // const stateData = JSON.stringify({
      //   userID,
      //   max,
      //   global_stock,
      // });

      // sessionStorage.setItem("lv_stock_state", stateData);

      sessionStorage.setItem("userID", userID);
      sessionStorage.setItem("max", max);

      const stockMap = ydoc.getMap("stock");
      if (!stockMap.has("globalStock")) {
        // Try to restore from LiveView state first
        // const savedState = sessionStorage.getItem("lv_stock_state");
        // if (savedState) {
        //   const { global_stock: saved_stock } = JSON.parse(savedState);
        //   stockMap.set("globalStock", { c: Number(saved_stock) });
        // } else {
        // Fall back to server-provided value
        stockMap.set("globalStock", { c: Number(global_stock) });
        // }
      }

      SolidComp({ ydoc, userID, max, el: this.el });

      console.log("live: ", window.liveSocket?.isConnected());
      if (window.liveSocket?.isConnected()) {
        this.pushEvent("stock", {
          user_id: sessionStorage.getItem("userID"),
          c: stockMap.get("globalStock").c,
        });
      }
    });

    this.handleEvent("new_stock", async ({ c }) => {
      isHandlingServerUpdate = true;
      try {
        const stockMap = ydoc.getMap("stock");

        stockMap.set("globalStock", { c });
        // Update stored state
        const stateData = JSON.stringify({
          userID: sessionStorage.getItem("userID"),
          max: sessionStorage.getItem("max"),
          global_stock: c,
        });
        sessionStorage.setItem("lv_stock_state", stateData);
      } finally {
        isHandlingServerUpdate = false;
      }
    });

    const stockMap = ydoc.getMap("stock");
    stockMap.observe((event) => {
      if (isHandlingServerUpdate) return;
      const globalStock = stockMap.get("globalStock");
      if (globalStock) {
        // Push to LiveView only if change originated from current user
        // This prevents broadcast loops
        console.log("observe", window.liveSocket?.isConnected());
        if (window.liveSocket?.isConnected()) {
          this.pushEvent("stock", {
            user_id: sessionStorage.getItem("userID"),
            c: globalStock.c,
          });
        }
      }
    });
  },
});
