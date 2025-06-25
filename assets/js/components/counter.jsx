import { lazy } from "solid-js";

// The callback runs every time the Shape data changes.
export default function Counter(props) {
  const Bins = lazy(() => import("@js/components/bins"));

  return (
    <>
      <p class="mt-4 mb-4 text-xl text-gray-800 w-full">
        The counter uses an <code>SQLite</code> database server-side and state
        is persisted client-side with <code>Yjs</code>.
      </p>
      <p class="mt-4 mb-4 text-xl text-gray-800 w-full">
        The component below is a reactive frontend component (
        <code>SolidJS</code>) that is mounted:
      </p>
      <p class="ml-8 mt-4 mb-4 text-xl text-gray-800 w-full>">
        {" "}
        - via a hook when online,
      </p>
      <p class="ml-8 mt-4 mb-4 text-xl text-gray-800 w-full">
        - rendered by <code>SolidJS</code> when offline.
      </p>
      <div class="flex flex-col       max-w-[450px]">
        <button
          id="take-from-stock"
          class={[
            props.inv ? "btn btn-custom-inverted" : "btn btn-custom",
            "w-full",
          ].join(" ")}
          // class="font-bold py-2 mt-4 px-4 rounded border border-gray-800 bg-bisque  text-midnightblue"
          onClick={() => props.onStockChange()}
        >
          Take from stock
        </button>
        <div id="input-stock" class="flex flex-col w-full">
          <label for="range-input" class="text-sm text-gray-600 mt-4 mb-2">
            <code>Yjs</code> local Stock:{" "}
            <span class="text-orange-600 ml-8">{props.stock}</span>
          </label>
          <input
            id="range-input"
            class="w-full"
            type="range"
            min={0}
            max={props.max}
            step="1"
            value={props.stock}
            disabled
          />

          <div id="bin-container" class="grid grid-cols-21 w-full">
            <Bins id={props.stock} range={props.range} max={props.max} />
          </div>
        </div>
      </div>
    </>
  );
}
