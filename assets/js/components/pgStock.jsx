import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
let dispose = null;

export const PgStock = (props) => {
  if (dispose) dispose();
  const ymap = props.ydoc.getMap("pg-data");

  const [localCounter, setLocalCounter] = createSignal(
    Math.round(Number(ymap.get("pg-count"))) || props.max
  );

  const [clicks, setClicks] = createSignal(
    Math.round(Number(ymap.get("clicks"))) || 0
  );

  const decrement = () => {
    const new_value = localCounter() == 0 ? props.max : localCounter() - 1;
    const new_clicks = clicks() + 1;
    setClicks(new_clicks);

    ymap.set("clicks", new_clicks);
    ymap.set("pg-count", new_value);
    setLocalCounter(new_value);
  };

  dispose = render(
    () => (
      <>
        <form phx-submit="dec" onSubmit={decrement} id="sol-pg-form">
          <button class="rounded-lg bg-bisque hover:bg-midnightblue py-2 px-3 text-sm font-semibold leading-6 text-midnightblue active:text-bisque ">
            Decrement Stock
          </button>
          <input
            type="range"
            min="0"
            max={props.max}
            name="dec-pg-sync-counter"
            value={localCounter()}
            aria-label="displayed-pg-stock"
          />
          <span class="ml-8">{localCounter()}</span>
        </form>
      </>
    ),
    props.el
  );

  return () => dispose();
};
