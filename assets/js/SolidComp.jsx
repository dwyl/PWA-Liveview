import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

export const SolidComp = ({ ydoc, userID, max, el }) => {
  const stockMap = ydoc.getMap("stock");
  const initialStock = stockMap.get("globalStock")?.c ?? 20;
  const [stock, setStock] = createSignal(initialStock);
  const [range, setRange] = createSignal([]);

  if (stockMap.has(userID)) {
    setStock(stockMap.get(userID).c);
  }

  const handleStockChange = (newValue) => {
    stockMap.set("globalStock", { c: newValue });
    setStock(newValue);
  };

  createEffect(() => {
    setRange((ar) => [...ar, ...Array(Number(max)).keys()]);
  });

  // external change update
  stockMap.observe((event) => {
    const userData = stockMap.get("globalStock");
    if (userData && userData.c !== stock()) {
      setStock(userData.c);
    }
  });

  const Counter = lazy(() => import("./counter.jsx"));

  render(
    () => (
      <Counter
        onStockChange={handleStockChange}
        stock={stock()}
        max={max}
        userID={userID}
        range={range()}
      />
    ),
    el
  );
};

window.SolidComp = SolidComp;
