// import initYdoc from "./initYJS.js";
import { createSignal, createEffect, Index } from "solid-js";
import { Dynamic } from "solid-js/web";

async function updateStore(ydoc, user_id, c) {
  const countMap = ydoc.getMap("count");
  const userID = String(user_id);
  countMap.set(userID, { user_id, c: Number(c) });
  // return Array.from(countMap.values());
}

function remainderMod(n, d) {
  console.log(n, d, d >= n ? n - (d % n) : n - d);
  return d > n ? n - (d % n) : n - d;
}

export default function Counter(props) {
  const ydoc = props.ydoc;
  const userID = String(props.userID);
  const [count, setCount] = createSignal(10);
  const [take, setTake] = createSignal(0);

  // first and only render
  setCount(props.val);
  createEffect(async () => updateStore(ydoc, userID, count()));

  return (
    <>
      <hr />
      <button
        class="font-bold py-2 px-4 rounded border border-gray-800"
        onClick={() => {
          setTake(take() + 1);
          setCount(remainderMod(props.max, take()));
        }}
      >
        Take from stock
      </button>
      <div class="flex flex-row items-start justify-between">
        <div class="flex flex-col items-center w-1/3">
          <br />
          <p class="mt-2 text-center">Stock: {count()}</p>
          <br />
        </div>
        <div class="w-2/3 max-w-full px-2">
          <div
            id="inputDiv"
            class="w-full max-w-[300px] relative px-[0] py-[10px]"
          >
            <input
              id="rangeInput"
              class="w-full m-0"
              type="range"
              min="0"
              max={props.max}
              step="1"
              value={count()}
              // onChange={(e) => setCount(e.currentTarget.value)}
            />

            <div
              id="binContainer"
              class="flex justify-between mt-[10px] px-[10px] py-[0] box-border"
            >
              <Bins id={count()} max={props.max} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const BlueBin = (props) => (
  <div style={"color: blue; font-wieght: bold"}>{props.value}</div>
);

const BlackBin = (props) => (
  <div style={"color: black; font-wieght: normal"}>{props.value}</div>
);

function Bins(props) {
  const range = [...Array(props.max + 1).keys()];
  return (
    <Index each={range}>
      {(i) => (
        <Dynamic component={i() <= props.id ? BlueBin : BlackBin} value={i()} />
      )}
    </Index>
  );
}

function Stock(props) {
  const [stock, setStock] = createSignal(props.initStock);
  return (
    <div>
      <button>Put Order: +</button>
    </div>
  );
}

// const createOrReadFromDB = async (props) => {
//   const res = await initYdoc({ yodc: props.ydoc, user_id: props.userID });
//   console.log("initTdoc", res);
// };
// async function initYdoc({ ydoc, user_id }) {
//   const userID = String(user_id);
//   const usersMap = ydoc.getMap("users");
//   const countMap = ydoc.getMap("count");

//   let user = usersMap.get(userID);
//   if (!user) {
//     console.log("create user");
//     user = { id: userID, name: "toto" };
//     usersMap.set(userID, user);
//   }

//   let count = countMap.get(userID);
//   if (!count) {
//     console.log("create count");
//     countMap.set(userID, { userID: userID, c: 0 });
//   }

//   // const users = Object.fromEntries(usersMap.entries());
//   const counters = Object.fromEntries(countMap.entries());

//   return counters;
// }
