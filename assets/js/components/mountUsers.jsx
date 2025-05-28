import { render } from "solid-js/web";
import { For, createSignal, batch } from "solid-js";

export function MountUsers(props) {
  console.log("[MountUsers]");

  const [users, setUsers] = createSignal(props.userIDs);
  const [dom, setDom] = createSignal(props.el);

  const dispose =
    props.el &&
    render(
      () => (
        <p class="text-sm text-midnightblue mt-4 mb-4" id="users">
          <span class="mr-2">{users().length}</span>
          Online user(s): &nbsp
          <For each={users()}>
            {(user) => (
              <span
                class={[
                  Number(user) !== Number(props.userID) ? "bg-bisque" : null,
                  "inline-flex mr-2 items-center px-2 py-1 text-xs font-medium border border-midnightblue text-midnightblue rounded-full",
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

  const update = (newProps) => {
    batch(() => {
      setUsers(newProps.userIDs);
      setDom(newProps.el);
    });
  };

  return {
    update,
    dispose,
  };
}
