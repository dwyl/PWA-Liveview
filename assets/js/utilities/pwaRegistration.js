// pwa-registration.js
// Central module for PWA and Service Worker registration

// State tracking
let updateSWFunction = null;
let hasNotifiedOfflineReady = false;
let isUpdateAvailable = false;

const callbacks = {
  onUpdateAvailable: null,
  onOfflineReady: null,
  onRegistered: null,
  onRegistrationError: null,
  onMessage: null,
};

async function registerServiceWorker() {
  try {
    const { registerSW } = await import("virtual:pwa-register");
    const swOptions = {
      immediate: true, // Register immediately in the app.js context
      onNeedRefresh: () => {
        // console.log("[PWA] New version available");
        isUpdateAvailable = true;

        // Notify anyone who's listening
        if (typeof callbacks.onUpdateAvailable === "function") {
          callbacks.onUpdateAvailable();
        }

        // If we're in a LiveView context, try to push an event
        if (window.liveSocket) {
          try {
            document.dispatchEvent(
              new CustomEvent("pwa-update-available", {
                detail: { updateAvailable: true },
              })
            );
          } catch (e) {
            console.error("[PWA] Failed to dispatch update event:", e);
          }
        }
      },
      onOfflineReady: () => {
        if (!hasNotifiedOfflineReady) {
          // console.log("[PWA] App now works offline");
          hasNotifiedOfflineReady = true;

          // Notify offline status
          if (typeof callbacks.onOfflineReady === "function") {
            callbacks.onOfflineReady();
          }

          // If we're in a LiveView context, try to push an event
          if (window.liveSocket) {
            try {
              document.dispatchEvent(
                new CustomEvent("pwa-offline-ready", {
                  detail: { ready: true },
                })
              );
            } catch (e) {
              console.error("[PWA] Failed to dispatch offline ready event:", e);
            }
          }
        }
      },
      onRegistered: (registration) => {
        console.log("[PWA] Service Worker registered");

        // Set up message handler
        setupSWMessageHandler(registration);

        // Callback
        if (typeof callbacks.onRegistered === "function") {
          callbacks.onRegistered(registration);
        }
      },
      onRegisterError: (error) => {
        // console.error("[PWA] Registration failed:", error);

        // Callback
        if (typeof callbacks.onRegistrationError === "function") {
          callbacks.onRegistrationError(error);
        }

        // If we're in a LiveView context, try to push an event
        if (window.liveSocket) {
          try {
            document.dispatchEvent(
              new CustomEvent("pwa-registration-error", {
                detail: { error: error.toString() },
              })
            );
          } catch (e) {
            console.error(
              "[PWA] Failed to dispatch registration error event:",
              e
            );
          }
        }
      },
    };

    // Register the service worker
    updateSWFunction = registerSW(swOptions);

    return true;
  } catch (error) {
    console.error("[PWA] Failed to load PWA module:", error);
    return false;
  }
}

// Handle messages from Service Worker
function setupSWMessageHandler(registration) {
  if (registration.active) {
    registration.active.addEventListener("message", (event) => {
      console.log("[SW] Message received:", event.data);

      // Handle specific message types from SW
      if (event.data.type === "CACHE_UPDATED") {
        document.dispatchEvent(
          new CustomEvent("pwa-cache-updated", {
            detail: event.data.payload,
          })
        );
      }

      // Callback for custom message handling
      if (typeof callbacks.onMessage === "function") {
        callbacks.onMessage(event.data);
      }
    });
  }
}

// Trigger an update when available
function updateServiceWorker() {
  if (updateSWFunction && isUpdateAvailable) {
    console.log("[PWA] Triggering service worker update");
    updateSWFunction();
    return true;
  }
  return false;
}

// Register callback functions
function registerCallbacks(callbacksObject) {
  // Merge provided callbacks with the existing ones
  Object.assign(callbacks, callbacksObject);
}

// Check if update is available
function isUpdateAvailableForSW() {
  return isUpdateAvailable;
}

// Export the public API
export {
  registerServiceWorker,
  updateServiceWorker,
  registerCallbacks,
  isUpdateAvailableForSW,
};
