import { Index } from "solid-js";
import { Dynamic } from "solid-js/web";

const BlueBin = (props) => (
  <div class="text-orange-600  font-mono text-center w-5">
    {props.value}
  </div>
);

const BlackBin = (props) => (
  <div class="text-gray-400 font-mono text-center text-xs w-5">
    {props.value}
  </div>
);

export default function Bins(props) {
  return (
    <Index each={props.range}>
      {(i) => (
        <Dynamic component={i() == props.id ? BlueBin : BlackBin} value={i()} />
      )}
    </Index>
  );
}
