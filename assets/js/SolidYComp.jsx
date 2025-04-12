import { render } from "solid-js/web";
import { createSignal, createEffect, lazy, onCleanup } from "solid-js";
// import { checkServer } from "./appV.js";

export const SolidYComp = ({ ydoc, userID, max, el }) => {
  const ymap = ydoc.getMap("stock");
  // Initialize Y.js state if needed
  if (ymap.get("stock-value") === undefined) {
    ydoc.transact(() => {
      ymap.set("stock-value", max);
    });
  }

  const [localStock, setLocalStock] = createSignal(ymap.get("stock-value"));
  const [range, setRange] = createSignal([]);
  // const [isOnline, setIsOnline] = createSignal(false);

  // const checkConnectivity = async () => {
  //   console.log("from SolidYComp");
  //   const serverReachable = await checkServer();
  //   setIsOnline(serverReachable);
  // };

  // // Check server connectivity periodically when offline
  // let intervalId = null;
  // if (!checkConnectivity()) {
  //   intervalId = setInterval(checkConnectivity, 1000);
  // }

  // Periodic check every 5 seconds

  createEffect(() => {
    setRange((ar) => [...ar, ...Array(Number(max)).keys()]);
  });

  // Listen for Y.js updates
  const yObserver = (event) => {
    if (event.changes.keys.has("stock-value")) {
      const newValue = ymap.get("stock-value");
      console.log(
        `Y.js updated value, received: ${newValue}, updating local signal`
      );
      // Always update local view to match Y.js state
      setLocalStock(newValue);
    }
  };

  ymap.observe(yObserver);

  onCleanup(() => {
    ymap.unobserve(yObserver);
    clearInterval(intervalId);
  });

  const Counter = lazy(() => import("./counter.jsx"));

  // Update Y.js state - this will trigger the observer
  const handleUpdate = (newValue) => {
    ydoc.transact(() => {
      ymap.set("stock-value", newValue);
    });
  };

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
