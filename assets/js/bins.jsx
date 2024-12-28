import { Index } from "solid-js";
import { Dynamic } from "solid-js/web";

const BlueBin = (props) => (
  <div style={"color: blue; font-weight: bold"}>{props.value}</div>
);

const BlackBin = (props) => (
  <div style={"color: black; font-weight: normal"}>{props.value}</div>
);

export function Bins(props) {
  console.log("bins", props.range);
  // let range = [
  //   0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  // ];
  return (
    <Index each={props.range}>
      {(i) => (
        <Dynamic component={i() <= props.id ? BlueBin : BlackBin} value={i()} />
      )}
    </Index>
  );
}
