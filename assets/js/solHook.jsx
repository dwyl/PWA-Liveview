import { render } from "solid-js/web";
import { lazy } from "solid-js";

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("destroyed");
  },
  async mounted() {
    const Counter = lazy(() => import("./counter.jsx"));
    const TextInput = lazy(() => import("./textInput.jsx"));

    this.handleEvent("user", ({ user_id }) => {
      let userID = String(user_id),
        countMap = ydoc.getMap("count").get(userID),
        textMap = ydoc.getMap("text").get(userID),
        counter = 0,
        text = "";

      if (countMap) {
        counter = countMap.c;
      }

      if (textMap) {
        text = textMap.t;
      }

      render(
        () => (
          <>
            <Counter userID={userID} val={counter} max={10} ydoc={ydoc} />
            <br />
            <p>Text saved on every change:</p>
            <TextInput ydoc={ydoc} userID={userID} val={text} />
          </>
        ),
        this.el
      );
    });
  },
});
