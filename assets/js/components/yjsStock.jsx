import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

const getCircularValue = (currentValue, max) => {
  return currentValue === 0 ? max : currentValue - 1;
};

export const YjsStock = (props) => {
  console.log("[YjsStock] component mounting");
  // Non-reactive destructuring
  // const { el, userID, max } = props;

  // ydoc is reactive
  let ymap;
  let max = null,
    el = null,
    range = null;

  createEffect(() => {
    ymap = props.ydoc.getMap("sql3-data");
  });

  const [localStock, setLocalStock] = createSignal(
    Math.round(Number(props.ydoc.getMap("sql3-data").get("counter"))) || max
  );

  /**
  Central state observer to update the UI:
  `observer` will trigger when the Yjs state changes wether:
  - from local user  (in Stock.handleUpdate) or 
  - from "init" or "remote" user (in the hook StockHook.js)
  The signal setter will eventually update the UI
  */
  ymap.observe(updateStockSignal);

  function updateStockSignal(event, { _origin }) {
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
    const newValue = getCircularValue(localStock(), max);

    props.ydoc.transact(() => {
      console.log("update YDoc");
      ymap.set("counter", newValue);
      ymap.set("clicks", (ymap.get("clicks") || 0) + 1);
    }, "local");
  };

  createEffect(() => {
    el = props.el;
    max = props.max;
  });

  const Counter = lazy(() => import("@jsx/components/counter"));
  range = [...Array(Number(max) + 1).keys()];

  const dispose = render(
    () => (
      <Counter
        id="counter"
        onStockChange={handleDecrement}
        stock={localStock()} // reactive signal
        max={max}
        userID={props.userID}
        range={range}
      />
    ),
    el
  );
  return () => {
    ymap.unobserve(updateStockSignal);
    dispose();
    console.log("[Stock & observer] cleanup");
  };
};
