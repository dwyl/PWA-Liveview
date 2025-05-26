import { render } from "solid-js/web";
import { For, createSignal } from "solid-js";

export function mountUsers(props) {
  const [users, setUsers] = createSignal(props.initIDs);
  const [dom, setDom] = createSignal(props.el);

  const dispose = render(
    () => (
      <p class="text-sm text-midnightblue mt-4 mb-4" id="users">
        <span class="mr-2">{users().length}</span>
        Online user(s): &nbsp
        <For each={users()}>
          {(user) => (
            <span
              class={[
                Number(user) !== Number(props.userID) ? "bg-green-200" : null,
                "inline-flex items-center px-2 py-1 text-xs font-medium border border-midnightblue text-midnightblue rounded-full",
              ].join(" ")}
            >
              {user}
            </span>
          )}
        </For>
      </p>
    ),
    dom()
  );
  return {
    update: ({ initIDs, el }) => {
      setUsers(initIDs);
      setDom(el);
    },
    dispose,
  };
}
