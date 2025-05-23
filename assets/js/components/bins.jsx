import { Index } from "solid-js";
import { Dynamic } from "solid-js/web";

const BlueBin = (props) => (
  <div class="text-midnightblue font-bold font-mono text-center text-sm w-5">
    {props.value}
  </div>
);

const BlackBin = (props) => (
  <div class="text-black font-normal font-mono text-center text-sm w-5">
    {props.value}
  </div>
);

export default function Bins(props) {
  return (
    <Index each={props.range}>
      {(i) => (
        <Dynamic component={i() <= props.id ? BlueBin : BlackBin} value={i()} />
      )}
    </Index>
  );
}
