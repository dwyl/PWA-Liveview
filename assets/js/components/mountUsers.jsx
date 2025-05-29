import { render } from "solid-js/web";
import { For, createSignal, batch } from "solid-js";

export function MountUsers({ userID, el, userIDs } = _props) {
  console.log("[MountUsers]");

  const [users, setUsers] = createSignal(userIDs);

  const dispose =
    el &&
    render(
      () => (
        <p class="text-sm text-midnightblue mt-4 mb-4" id="users">
          <span class="mr-2">{users().length}</span>
          Online user(s): &nbsp
          <For each={users()}>
            {(user) => (
              <span
                class={[
                  Number(user) !== Number(userID) ? "bg-bisque" : null,
                  "inline-flex mr-2 items-center px-2 py-1 text-xs font-medium border border-midnightblue text-midnightblue rounded-full",
                ].join(" ")}
              >
                {user}
              </span>
            )}
          </For>
        </p>
      ),
      el
    );

  const update = ({ userIDs, el }) => {
    batch(() => {
      setUsers(userIDs);
      setDom(el);
    });
  };

  return {
    update,
    dispose,
  };
}
