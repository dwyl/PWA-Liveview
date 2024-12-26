// import initYdoc from "./initYJS.js";
import { createSignal, createEffect, onMount } from "solid-js";
import { createBins, updateBins } from "./inputRanged.js";

async function initDB({ ydoc, user_id }) {
  const userID = String(user_id);
  const usersMap = ydoc.getMap("users");
  const countMap = ydoc.getMap("count");

  let user = usersMap.get(userID);
  if (!user) {
    console.log("create user");
    user = { id: userID, name: "toto" };
    usersMap.set(userID, user);
  }

  let count = countMap.get(userID);
  if (!count) {
    console.log("create count");
    countMap.set(userID, { userID: userID, c: 0 });
  }

  // const users = Object.fromEntries(usersMap.entries());
  const counters = Object.fromEntries(countMap.entries());

  return counters;
}

async function updateStore(ydoc, user_id, c) {
  console.log("updateStore with: ", c);
  const countMap = ydoc.getMap("count");
  const userID = String(user_id);
  const count = countMap.get(userID);
  countMap.set(userID, { ...count, c: Number(c) }); // Update shared state
  return Array.from(countMap.values());
}

export default function Counter(props) {
  console.log("Render Component");

  const ydoc = props.ydoc;
  const userID = String(props.userID);
  const [count, setCount] = createSignal(0);
  setCount(props.val);

  onMount(async () => {
    const res = await initDB({ ydoc, user_id: userID });
    console.log(res);
    createBins(props.max);
  });

  createEffect(async () => {
    updateBins(count());
    updateStore(ydoc, userID, count());
  });
  return (
    <>
      <hr />
      <br />
      <div id="inputDiv" class="w-full max-w-[300px] relative px-[0] py-[10px]">
        <input
          id="rangeInput"
          class="w-full m-0"
          type="range"
          min="0"
          max={props.max}
          step="1"
          value={count()}
          onChange={async (e) => setCount(e.currentTarget.value)}
        />
        <div
          id="binContainer"
          class="flex justify-between mt-[10px] px-[10px] py-[0] box-border"
        ></div>
      </div>
      <p>Value: {count()}</p>
    </>
  );
}
