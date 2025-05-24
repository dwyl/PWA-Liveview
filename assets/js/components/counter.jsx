import { lazy } from "solid-js";

// The callback runs every time the Shape data changes.
export default function Counter(props) {
  const Bins = lazy(() => import("@jsx/components/bins"));

  const handleTake = props.onStockChange;

  return (
    <>
      <h2 class="mt-4 mb-4 text-xl text-gray-600">
        The counter uses <code>Yjs</code> client-side, and communicates via a
        Channel to synchronize with an
        <code>SQLite</code> database.
      </h2>
      <button
        id="takeFromStock"
        class="font-bold py-2 mt-4 px-4 rounded border border-gray-800 bg-bisque text-midnightblue transition-all duration-300 ease-in-out active:scale-95 active:bg-burlywood hover:bg-wheat"
        onClick={handleTake}
      >
        Take from stock
      </button>
      <div
        id="inputStock"
        class="w-full mt-4 max-w-[300px] relative px-[0] py-[10px]"
      >
        <label for="rangeInput" class="text-sm text-gray-600 mt-4 mb-2">
          <code>Yjs</code> local Stock: {props.stock}
        </label>
        <input
          id="rangeInput"
          class="w-full m-0 mt-4"
          type="range"
          min={0}
          max={props.max}
          step="1"
          value={props.stock}
          disabled
        />

        <div
          id="binContainer"
          class="flex justify-between mt-[10px] px-[10px] py-[0] box-border"
        >
          <Bins id={props.stock} range={props.range} max={props.max} />
        </div>
      </div>
    </>
  );
}
