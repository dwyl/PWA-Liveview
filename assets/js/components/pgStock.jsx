import { createSignal, batch, lazy } from "solid-js";
import { render } from "solid-js/web";

export const PgStock = ({ ydoc, max, el, _userID, inv }) => {
  const ymap = ydoc.getMap("pg-data");
  const Bins = lazy(() => import("@js/components/bins"));

  const [localCounter, setLocalCounter] = createSignal(
    ymap.get("pg-count") || max
  );
  const [clicks, setClicks] = createSignal(ymap.get("clicks") || 0);
  const range = [...Array(Number(max) + 1).keys()];

  const decrement = () => {
    const new_value = localCounter() == 0 ? max : localCounter() - 1;
    const new_clicks = clicks() + 1;
    batch(() => {
      setClicks(new_clicks);
      setLocalCounter(new_value);
      ymap.set("clicks", new_clicks);
      ymap.set("pg-count", new_value);
    });
  };

  const dispose = render(
    () => (
      <div>
        <form
          phx-submit="dec"
          onSubmit={decrement}
          id="sol-pg-form"
          class="flex flex-col"
        >
          <button
            class={[
              inv ? "btn btn-custom-inverted" : "btn btn-custom",
              "w-full",
            ].join(" ")}
          >
            Decrement Stock
          </button>
          <label for="range-input" class="text-sm text-gray-600 mt-4 mb-2">
            <code>Phoenix.Sync</code>
            PostgreSQL Stock:{" "}
            <span class="text-orange-600 ml-8">{localCounter()}</span>
          </label>
          <input
            id="range-input"
            type="range"
            min="0"
            max={max}
            name="dec-pg-sync-counter"
            value={localCounter()}
            aria-label="displayed-pg-stock"
            disabled
          />
          <div id="bin-container" class="grid grid-cols-21 w-full">
            <Bins id={localCounter()} range={range} max={max} />
          </div>
        </form>
      </div>
    ),
    el
  );

  return () => dispose();
};
