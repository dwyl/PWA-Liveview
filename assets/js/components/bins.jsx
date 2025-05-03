import { Index } from "solid-js";
import { Dynamic } from "solid-js/web";

const BlueBin = (props) => (
  <div style={"color: midnightblue; font-weight: bold"}>{props.value}</div>
);

const BlackBin = (props) => (
  <div style={"color: black; font-weight: normal"}>{props.value}</div>
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
