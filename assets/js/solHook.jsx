import { render } from "solid-js/web";
import { lazy } from "solid-js";
// import { updateSW } from "./app.js";

export const SolidComp = ({ ydoc, user_id, el }) => {
  const Counter = lazy(() => import("./counter.jsx"));
  const TextInput = lazy(() => import("./textInput.jsx"));
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
        {/* <button
          class="font-bold py-2 px-4 rounded border border-gray-800"
          onClick={() => updateSW(true)}
        >
          Refresh
        </button> */}

        <Counter userID={userID} val={counter} max={10} ydoc={ydoc} />
        <br />
        <p>Text saved on every change:</p>
        <TextInput ydoc={ydoc} userID={userID} val={text} />
      </>
    ),
    el
  );
};

window.SolidComp = SolidComp;

export const solHook = (ydoc) => ({
  destroyed() {
    console.log("destroyed");
  },
  async mounted() {
    this.handleEvent("user", ({ user_id }) => {
      if (!ydoc.getMap("user").get("id")) {
        ydoc.getMap("count").set(user_id.toString(), { c: 10 });
      }
      ydoc.getMap("user").set("id", user_id.toString());
      SolidComp({ ydoc, user_id, el: this.el });
    });

    ydoc.getMap("count").observe(() => {
      const userID = ydoc.getMap("user").get("id");
      this.pushEvent("stock", ydoc.getMap("count").get(userID));
    });
  },
});
