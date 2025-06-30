import { setAppState } from "@js/stores/AppStore.js";
import { checkServer } from "@js/utilities/checkServer.js";

const log = console.log;
const error = console.error;

/**
 * Initializes and configures a Phoenix WebSocket connection for authenticated users.
 * Sets up automatic error recovery with token refresh and connection lifecycle management.
 * In case of socket errors, attempts to refresh the authentication token automatically.
 * Redirects to "/" if token refresh fails or authentication is invalid.
 *
 * @async
 * @function setUserSocket
 * @param {string|null} initialUserToken - The initial user authentication token
 * @returns {Promise<Socket|null>} Connected Phoenix Socket instance or null if no token provided
 * @throws {Error} When socket creation or connection fails
 *
 * @description
 * This function creates a complete WebSocket connection management system:
 * 1. Validates initial token and returns null if not provided
 * 2. Creates Phoenix Socket with authentication parameters
 * 3. Sets up error recovery handlers that trigger token refresh
 * 4. Configures connection lifecycle event handlers
 * 5. Establishes the initial connection
 *
 * @example
 * // Initialize socket with token
 * const socket = await setUserSocket('user-token-123');
 * if (socket) {
 *   console.log('Socket connected successfully');
 * }
 *
 * @example
 * // Initialize without token (returns null)
 * const socket = await setUserSocket(null);
 * console.log(socket); // null
 */
export async function setUserSocket(initialUserToken) {
  const { Socket } = await import("phoenix");

  let currentUserToken = initialUserToken;
  let isRefreshing = false; // Prevent concurrent refresh attempts

  if (!initialUserToken) {
    reset();
    return null;
  }

  const csrf = document.querySelector("meta[name='csrf-token']")?.content;

  const userSocket = new Socket("/user", {
    params: () => ({ userToken: initialUserToken, _csrf_token: csrf }),
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
        window.location.href = "/";
      }

      return false;
    } catch (err) {
      error("[refreshTokenAndUpdate]: ", err);
      reset();
      window.location.href = "/";
    }
  }

  // --- Set up socket event handlers --- //
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
