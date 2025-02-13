import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

export const SolidYComp = ({ ydoc, userID, max, el }) => {
  const ymap = ydoc.getMap("stock");
  const [localStock, setLocalStock] = createSignal(
    ymap.get("stock-value") || 20
  );
  const [range, setRange] = createSignal([]);

  const handleUpdate = (newValue) => {
    // push updates to the hook
    ydoc.transact(() => {
      ymap.set("stock-value", newValue);
    }, "local");

    setLocalStock(newValue);
  };

  createEffect(() => {
    setRange((ar) => [...ar, ...Array(Number(max)).keys()]);
  });

  // get updates from the hook
  ymap.observe((event) => {
    if (event.changes.keys.has("stock-value")) {
      setLocalStock(ymap.get("stock-value"));
    }
  });

  const Counter = lazy(() => import("./counter.jsx"));

  render(
    () => (
      <Counter
        onStockChange={handleUpdate}
        stock={localStock()}
        max={max}
        userID={userID}
        range={range()}
      />
    ),
    el
  );
};
