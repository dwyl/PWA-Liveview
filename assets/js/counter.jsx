// import initYdoc from "./initYJS.js";
import { Bins } from "./bins.jsx";

export default function Counter(props) {
  const handleTake = () => {
    // keep a circular range for the demo
    const newStock = props.stock === 0 ? props.max : props.stock - 1;
    props.onStockChange(newStock);
  };

  return (
    <>
      <h1 class="mt-4 mb-4 text-2xl text-gray-600">SolidJS dynamic</h1>
      <div class="text-sm text-gray-600 mt-4 mb-2">User ID: {props.userID}</div>
      <button
        class="font-bold py-2 mt-4 px-4 rounded border border-gray-800"
        onClick={handleTake}
      >
        Take from stock
      </button>
      <div
        id="inputStock"
        class="w-full mt-4 max-w-[300px] relative px-[0] py-[10px]"
      >
        <label for="rangeInput">Read-only Stock: {props.stock}</label>
        <input
          id="rangeInput"
          class="w-full m-0 mt-4"
          type="range"
          min="0"
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
