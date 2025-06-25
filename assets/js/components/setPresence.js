import { appState } from "@js/stores/AppStore";

const NAVIDS = appState.CONFIG.NAVIDS;

export async function setPresence(userSocket, topic, user_token) {
  const [{ Presence }, { useChannel }, { MountUsers }] = await Promise.all([
    import("phoenix"),
    import("@js/user_socket/useChannel"),
    import("@js/components/mountUsers"),
  ]);

  const channel = await useChannel(userSocket, topic, { user_token });
  const presence = new Presence(channel);

  let userID = null;
  let userIDs = [];
  let usersComponent = null;

  // Track user ID sent from backend
  channel.on("user", ({ from }) => {
    userID = from;
  });

  // Utility: determine which DOM ID to use
  const getTargetEl = () => {
    const path = window.location.pathname;
    const id =
      path === "/yjs"
        ? NAVIDS.yjs.id
        : path === "/map"
        ? NAVIDS.map.id
        : path === "/sync"
        ? NAVIDS.sync.id
        : null;
    if (!id) {
      return null;
    }
    return document.getElementById(id);
  };

  // Render or update the component, if possible
  const tryRender = () => {
    const el = getTargetEl();
    if (!el) return;

    // Avoid duplicate mounting
    if (usersComponent) {
      if (el === usersComponent.el) {
        console.log("[tryRender] Same element, updating...");
        usersComponent.update({ userIDs, userID, el });
        return;
      } else {
        console.log("[tryRender] Disposing old, mounting new...");
        usersComponent.dispose();
        usersComponent = MountUsers({ userIDs, userID, el });
      }
    } else {
      console.log("[tryRender] No component, mounting...");
      usersComponent = MountUsers({ userIDs, userID, el });
    }
    // usersComponent.el = el;
  };

  // Sync presence when changed
  presence.onSync(() => {
    console.log("[presence.onSync]");
    userIDs = presence.list((id, _meta) => id);
    tryRender();
  });

  // Handle LiveView navigation
  window.addEventListener("phx:page-loading-stop", () => tryRender());
}
