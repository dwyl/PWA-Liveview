import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

export const SolidYComp = ({ ydoc, userID, max, el }) => {
  const ymap = ydoc.getMap("stock");
  const [localStock, setLocalStock] = createSignal(ymap.get("stock-value"));
  const [range, setRange] = createSignal([]);
  const Counter = lazy(() => import("./counter.jsx"));

  // Initialize Y.js state if needed
  if (ymap.get("stock-value") === undefined) {
    ydoc.transact(() => {
      ymap.set("stock-value", max);
    });
  }
  // This observer will be called when the Y.js state changes
  // wether from local user or remote user

  ymap.observeDeep(updateStockSignal);

  function updateStockSignal(events, { origin }) {
    for (const event of events) {
      if (event.keysChanged.has("stock-value")) {
        setLocalStock(ymap.get("stock-value"));
        console.log(userID, "observes change from: ", origin);
      }
    }
  }

  // this will trigger the observer and set the origin of the change
  // so yHook can use it
  const handleUpdate = (newValue) => {
    console.log(userID, "clicks on stock", newValue);
    ydoc.transact(() => {
      ymap.set("stock-value", newValue);
    }, userID);
  };

  createEffect(() => {
    setRange((ar) => [...ar, ...Array(Number(max)).keys()]);
  });

  const dispose = render(
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

  // Memory leak!
  // return a ref to the render so it will be properly cleaned up
  // when the component is unmounted.
  // this is a workaround for the SolidJS lifecycle
  // and the fact that we need to clean up the observer
  // when the component is unmounted.
  // since the lifecycle is managed by Phoenix.js
  //  so "onCleanup" won't work.
  return () => {
    dispose();
    ymap.unobserveDeep(updateStockSignal);
    console.log("Observer cleanup");
    console.log("SolidYComp cleanup completed for user:", userID);
  };
};
