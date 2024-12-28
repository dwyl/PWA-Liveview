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
      localStorage.setItem("userID", userID);

      const stockMap = ydoc.getMap("stock");
      if (!stockMap.has("globalStock")) {
        stockMap.set("globalStock", { c: Number(global_stock) });
      }

      SolidComp({ ydoc, userID, max, el: this.el });
    });

    this.handleEvent("new_stock", async ({ c }) => {
      isHandlingServerUpdate = true;
      console.log("Received broadcast stock update:", c);
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
        console.log(Array.from(event.changes.keys.entries()));
        const globalStock = stockMap.get("globalStock");
        if (globalStock) {
          // Push to LiveView only if change originated from current user
          // This prevents broadcast loops
          this.pushEvent("stock", {
            user_id: localStorage.getItem("userID"),
            c: globalStock.c,
          });
        }
      }
    });
  },
});
