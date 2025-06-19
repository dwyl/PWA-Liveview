import { setAppState } from "@js/stores/AppStore.js";
import { checkServer } from "@js/utilities/checkServer.js";

const log = console.log;
const error = console.error;

export async function setUserSocket(initialUserToken) {
  const { Socket } = await import("phoenix");

  let currentUserToken = initialUserToken;
  let isRefreshing = false; // Prevent concurrent refresh attempts

  if (!initialUserToken) {
    reset();
    return null;
  }

  const userSocket = new Socket("/user", {
    params: () => ({ userToken: initialUserToken }),
  });

  function reset() {
    currentUserToken = null;
    isRefreshing = false;
    setAppState("userToken", null);
    setAppState("userSocket", null);
    userSocket?.disconnect();
  }

  async function refreshTokenAndUpdate() {
    if (isRefreshing) {
      return false;
    }
    isRefreshing = true;

    const csrfTokenEl = document.querySelector("meta[name='csrf-token']");
    if (!csrfTokenEl) {
      reset();
      return false;
    }

    try {
      const response = await fetch("/api/refresh_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfTokenEl.content,
        },
        cache: "no-store",
        credentials: "include",
      });

      if (response.ok) {
        const { user_token } = await response.json();
        currentUserToken = user_token; // New access token
        isRefreshing = false;
        if (!currentUserToken) {
          reset();
          return false;
        }
        log("[Refreshed Access token] success");
        setAppState("userToken", currentUserToken);
        setAppState("userSocket", userSocket);
        return true;
      } else {
        reset();
      }

      return false;
    } catch (err) {
      error("[refreshTokenAndUpdate]: ", err);
      reset();
      return false;
    }
  }

  userSocket.onError(async () => {
    if (isRefreshing) {
      return false;
    }

    if (!currentUserToken) {
      reset();
      return false;
    }

    if (!(await checkServer())) {
      reset();
      return false;
    }
    const refreshedOk = await refreshTokenAndUpdate();
    if (refreshedOk) {
      userSocket.disconnect();
      userSocket.params = () => ({ userToken: currentUserToken });
      userSocket.connect();
    }
  });

  userSocket.onClose((_event) => {
    if (!currentUserToken) {
      reset();
      return false;
    }
  });

  // --- Connect after all handlers are set up --- //

  userSocket.connect();
  return userSocket;
}
