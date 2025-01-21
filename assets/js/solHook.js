import { SolidComp } from "./SolidComp";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("stock destroyed-----");
  },
  async mounted() {
    let isHandlingServerUpdate = false,
      userID = null;

    const stockMap = ydoc.getMap("stock");

    this.handleEvent("store", ({ key, data }) => {
      sessionStorage.setItem(key, data);
    });

    this.handleEvent("clear", ({ key }) => {
      sessionStorage.removeItem(key);
    });

    this.handleEvent("new user", ({ user_id, global_stock, max }) => {
      userID = String(user_id);
      sessionStorage.setItem("userID", userID);
      sessionStorage.setItem("max", max);

      // new user
      if (!stockMap.has("globalStock")) {
        stockMap.set("globalStock", { c: Number(global_stock) });
      } else {
        // pubsub own yjs state on connection
        this.pushEvent("yjs-stock", { c: stockMap.get("globalStock").c });
      }

      SolidComp({ ydoc, userID, max, el: this.el });
    });

    // external stock update
    this.handleEvent("new_stock", async ({ c }) => {
      isHandlingServerUpdate = true;
      try {
        const stockMap = ydoc.getMap("stock");

        stockMap.set("globalStock", { c });
      } finally {
        isHandlingServerUpdate = false;
      }
    });

    // observe stock changes from Component
    stockMap.observe((event) => {
      if (isHandlingServerUpdate) return;
      const globalStock = stockMap.get("globalStock");
      if (globalStock) {
        this.pushEvent("stock", {
          user_id: sessionStorage.getItem("userID"),
          c: globalStock.c,
        });
      }
    });
  },
});
