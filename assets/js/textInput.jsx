import { createEffect, createSignal } from "solid-js";

async function updateStore(ydoc, user_id, t) {
  const textMap = ydoc.getMap("text");
  const userID = String(user_id);
  textMap.set(userID, { user_id, t });
}

export default function TextInput(props) {
  const [text, setText] = createSignal("");
  // first and only render
  setText(props.val);

  createEffect(async () => updateStore(props.ydoc, props.userID, text()));
  return (
    <div id="inputText" class="w-full max-w-[300px] relative px-[0] py-[10px]">
      <input
        id="textInput"
        class="w-full m-0"
        type="text"
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
      />
    </div>
  );
}
