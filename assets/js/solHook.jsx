import { SolidComp } from "./SolidComp";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("destroyed");
  },
  async mounted() {
    let isHandlingServerUpdate = false,
      userID = null;

    this.handleEvent("user", async ({ user_id, global_stock, max }) => {
      userID = String(user_id);
      sessionStorage.setItem("userID", userID);
      sessionStorage.setItem("max", max);

      const stockMap = ydoc.getMap("stock");
      if (!stockMap.has("globalStock")) {
        stockMap.set("globalStock", { c: Number(global_stock) });
      }

      SolidComp({ ydoc, userID, max, el: this.el });

      if (window.liveSocket.isConnected()) {
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
      } finally {
        isHandlingServerUpdate = false;
      }
    });

    const stockMap = ydoc.getMap("stock");
    stockMap.observe((event) => {
      if (!isHandlingServerUpdate) {
        const globalStock = stockMap.get("globalStock");
        if (globalStock) {
          // Push to LiveView only if change originated from current user
          // This prevents broadcast loops
          if (window.liveSocket.isConnected()) {
            this.pushEvent("stock", {
              user_id: sessionStorage.getItem("userID"),
              c: globalStock.c,
            });
          }
        }
      }
    });
  },
});
