import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

let dispose = null;

const getCircularValue = (currentValue, max) => {
  return currentValue === 0 ? max : currentValue - 1;
};

export const YjsStock = (props) => {
  if (dispose) dispose();

  console.log(props);

  const ymap = props.ydoc.getMap("sql3-data");

  const [localStock, setLocalStock] = createSignal(
    Math.round(Number(ymap.get("counter"))) || props.max
  );
  const [range, setRange] = createSignal([]);
  const Counter = lazy(() => import("@jsx/components/counter"));

  /**
  Central state observer to update the UI:
  `observer` will trigger when the Yjs state changes wether:
  - from local user  (in Stock.handleUpdate) or 
  - from "init" or "remote" user (in the hook StockHook.js)
  The signal setter will eventually update the UI
  */
  ymap.observe(updateStockSignal);

  function updateStockSignal(event, { origin }) {
    console.log("origin: ", origin);
    if (event.keysChanged.has("counter")) {
      // y_ex sends BigInt so we convert it into an integer
      setLocalStock(Math.round(Number(ymap.get("counter"))));
    }
  }

  /**
  Local action: just update Yjs state
  This will trigger the observer above 
  */
  const handleDecrement = () => {
    // keep a circular range for the demo: shouldn't it go up?
    const newValue = getCircularValue(localStock(), props.max);

    props.ydoc.transact(() => {
      ymap.set("counter", newValue);
      ymap.set("clicks", (ymap.get("clicks") || 0) + 1);
    }, "local");
  };

  createEffect(() => {
    setRange([...Array(Number(props.max) + 1).keys()]);
  });

  dispose = render(
    () => (
      <Counter
        id="counter"
        onStockChange={handleDecrement}
        stock={localStock()}
        max={props.max}
        userID={props.userID}
        range={range()}
      />
    ),
    props.el
  );
  return () => {
    ymap.unobserve(updateStockSignal);
    dispose();
    console.log("[Stock & observer] cleanup");
  };

  /**
   Potential memory leak if we don't clean up the observer
  */
};
