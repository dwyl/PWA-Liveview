import { render } from "solid-js/web";
import { createSignal, createEffect, lazy } from "solid-js";

export const SolidComp = ({ ydoc, userID, max, el }) => {
  const Counter = lazy(() => import("./counter.jsx"));

  const stockMap = ydoc.getMap("stock");
  const initialStock = stockMap.get("globalStock")?.c ?? 10;
  const [stock, setStock] = createSignal(initialStock);

  if (stockMap.has(userID)) {
    setStock(stockMap.get(userID).c);
  }

  const handleStockChange = (newValue) => {
    stockMap.set("globalStock", { c: newValue });
    setStock(newValue);
  };

  createEffect(() => {
    stockMap.observe(() => {
      const userData = stockMap.get("globalStock");
      console.log(userData, userData.c, stock());
      if (userData && userData.c !== stock()) {
        setStock(userData.c);
      }
    });
  });

  createEffect(() => console.log("udpated stock: ", stock()));

  render(
    () => (
      <Counter
        onStockChange={handleStockChange}
        stock={stock()}
        max={max}
        userID={userID}
      />
    ),
    el
  );
};

window.SolidComp = SolidComp;
