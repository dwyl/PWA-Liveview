// import initYdoc from "./initYJS.js";
import { Index } from "solid-js";
import { Dynamic } from "solid-js/web";

export default function Counter(props) {
  const { max, userID, onStockChange } = props;

  const handleTake = () => {
    // keep a circular range for the demo
    const newStock = props.stock === 0 ? max : props.stock - 1;
    onStockChange(newStock);
  };

  return (
    <>
      <h1 class="mt-4 mb-4 text-2xl text-gray-600">SolidJS dynamic</h1>
      <div class="text-sm text-gray-600 mt-4 mb-2">User ID: {userID}</div>
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
          max={max}
          step="1"
          value={props.stock}
          disabled
        />

        <div
          id="binContainer"
          class="flex justify-between mt-[10px] px-[10px] py-[0] box-border"
        >
          <Bins id={props.stock} max={max} />
        </div>
      </div>
    </>
  );
}

const BlueBin = (props) => (
  <div style={"color: blue; font-weight: bold"}>{props.value}</div>
);

const BlackBin = (props) => (
  <div style={"color: black; font-weight: normal"}>{props.value}</div>
);

function Bins(props) {
  const range = [...Array(props.max + 1).keys()];
  console.log("Bins", props.max, range);
  return (
    <Index each={range}>
      {(i) => (
        <Dynamic component={i() <= props.id ? BlueBin : BlackBin} value={i()} />
      )}
    </Index>
  );
}
