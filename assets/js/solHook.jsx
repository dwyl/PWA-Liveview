import { render } from "solid-js/web";
import { lazy } from "solid-js";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("destroyed");
  },
  async mounted() {
    const Counter = lazy(() => import("./counter.jsx"));

    this.handleEvent("user", ({ user_id }) => {
      const userID = String(user_id);
      const countMap = ydoc.getMap("count").get(userID);
      let c = 0;
      if (countMap) {
        c = ydoc.getMap("count").get(userID).c;
      }
      render(
        () => <Counter userID={user_id} val={c} max={10} ydoc={ydoc} />,
        this.el
      );
    });
  },
});
