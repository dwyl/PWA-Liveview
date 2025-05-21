import { CONFIG } from "@js/main";

export async function setPresenceChannel(userSocket, topic, user_token) {
  const [{ Presence }, { useChannel }, { mountUsers }] = await Promise.all([
    import("phoenix"),
    import("@js/user_socket/useChannel"),
    import("@js/components/users"),
  ]);
  // const response = await fetch("/api/user_token");
  // const { user_token } = await response.json();

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
      case "/":
        return CONFIG.NAVIDS.yjs.id;
      case "/map":
        return CONFIG.NAVIDS.map.id;
      case "/elec":
        return CONFIG.NAVIDS.elec.id;
      default:
        return CONFIG.NAVIDS.yjs.id;
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
