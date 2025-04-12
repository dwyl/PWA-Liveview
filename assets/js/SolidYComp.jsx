import { render } from "solid-js/web";
import { createSignal, createEffect, lazy, onCleanup } from "solid-js";

export const SolidYComp = ({ ydoc, userID, max, el }) => {
  const [localStock, setLocalStock] = createSignal(ymap.get("stock-value"));
  const [range, setRange] = createSignal([]);
  const Counter = lazy(() => import("./counter.jsx"));

  const ymap = ydoc.getMap("stock");
  // Initialize Y.js state if needed
  if (ymap.get("stock-value") === undefined) {
    ydoc.transact(() => {
      ymap.set("stock-value", max);
    });
  }
  // Listen for Y.js updates
  const yObserver = (event) => {
    if (event.changes.keys.has("stock-value")) {
      const newValue = ymap.get("stock-value");
      console.log(
        `${userID} SolidYComp yObserver gets Y.js updated value, received: ${newValue}, updating local signal`
      );

      setLocalStock(newValue);
    }
  };
  // const yObserver = (event) => {
  //   if (event.changes.keys.has("stock-value")) {
  //     setLocalStock(ymap.get("stock-value"));
  //   }
  // };

  ymap.observe(yObserver);

  onCleanup(() => {
    ymap.unobserve(yObserver);
  });

  // Update Y.js state - this will trigger the observer
  const handleUpdate = (newValue) => {
    ydoc.transact(() => {
      ymap.set("stock-value", newValue);
    });
  };

  createEffect(() => {
    setRange((ar) => [...ar, ...Array(Number(max)).keys()]);
  });

  return render(
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
