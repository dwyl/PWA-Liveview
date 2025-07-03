import { setAppState } from "@js/stores/AppStore.js";

const csrf = () => {
  const csrfTokenEl = document.querySelector("meta[name='csrf-token']");
  if (!csrfTokenEl) {
    return null;
  }
  return csrfTokenEl.content;
};

export async function setUserSocket(_user_token) {
  const { Socket } = await import("phoenix");

  const userSocket = new Socket("/user", {
    // params: () => ({ userToken: user_token, _csrf_token: csrf() }),
    params: () => ({ _csrf_token: csrf() }),
  });

  userSocket.onError(async () => {
    userSocket?.disconnect();
    setAppState("userToken", null);
    setAppState("userSocket", null);
    window.location.href = "/";
  });

  // --- Connect after all handlers are set up --- //

  userSocket.connect();
  return userSocket;
}
