import { render } from "solid-js/web";
import { For, createSignal, batch } from "solid-js";

export function MountUsers({ userID, el, userIDs } = _props) {
  console.log("[MountUsers] -----");

  const [users, setUsers] = createSignal(userIDs);

  const dispose = render(
    () => (
      <p class="text-sm text-gray-600 mt-4 mb-4" id="users">
        <span class="mr-2">{users().length}</span>
        Online user(s): &nbsp
        <For each={users()}>
          {(u) => (
            <span
              class={[
                Number(u) !== Number(userID) ? "bg-bisque" : null,
                "inline-flex mr-2 items-center px-2 py-1 text-xs font-medium border border-midnightblue text-midnightblue rounded-full",
              ].join(" ")}
            >
              {u}
            </span>
          )}
        </For>
      </p>
    ),
    el
  );

  const update = ({ userIDs, _userID, el }) => {
    batch(() => {
      setUsers(userIDs);
      if (el !== domEl()) {
        dispose();
      }
    });
  };

  return {
    update,
    dispose,
  };
}
