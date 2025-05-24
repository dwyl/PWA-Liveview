import { CONFIG } from "@js/main";

// const NAVIDS = {
//   yjs: { path: "/yjs", id: "users-yjs" },
//   map: { path: "/map", id: "users-map" },
//   elec: { path: "/", id: "users-elec" },
// };

export async function setPresence(userSocket, topic, user_token) {
  const [{ Presence }, { useChannel }, { mountUsers }] = await Promise.all([
    import("phoenix"),
    import("@js/user_socket/useChannel"),
    import("@js/components/users"),
  ]);

  const channel = await useChannel(userSocket, topic, {
    user_token,
  });

  let usersComponent = null,
    userID = null,
    userIDs = [];

  channel.on("user", ({ from }) => {
    userID = from;
  });

  const getTargetID = () => {
    switch (window.location.pathname) {
      case "/yjs":
        return CONFIG.NAVIDS.yjs.id;
      case "/map":
        return CONFIG.NAVIDS.map.id;
      case "/":
        return CONFIG.NAVIDS.elec.id;
      default:
        return CONFIG.NAVIDS.elec.id;
    }
  };

  window.addEventListener("phx:page-loading-stop", () => {
    maybeRenderUsers();
  });

  const presence = new Presence(channel);

  presence.onSync(() => {
    userIDs = presence.list((id, _meta) => id);
    maybeRenderUsers();
  });

  function maybeRenderUsers() {
    const el = document.getElementById(getTargetID());
    if (!el) return;

    if (usersComponent) {
      usersComponent.dispose();
    }

    usersComponent = mountUsers({
      initIDs: userIDs,
      userID,
      el,
    });
  }

  channel.onClose(() => {
    if (usersComponent) {
      usersComponent.dispose();
      usersComponent = null;
    }
  });
}
