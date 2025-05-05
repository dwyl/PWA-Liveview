// pwa-registration.js
// Central module for PWA and Service Worker registration

let updateSWFunction = null;

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const { registerSW } = await import("virtual:pwa-register");
    const swOptions = {
      // immediate: true, // Register immediately in the app.js context
      onNeedRefresh: () => {
        console.log("[PWA] New version available");
        if (window.liveSocket) {
          try {
            window.dispatchEvent(
              new CustomEvent("pwa-update-available", {
                detail: { update_available: true },
              })
            );
          } catch (e) {
            console.error("[PWA] Failed to dispatch update event:", e);
          }
        }
      },
      onOfflineReady: () => {
        console.log("[PWA] App now works offline");
        if (window.liveSocket) {
          try {
            window.dispatchEvent(
              new CustomEvent("pwa-offline-ready", {
                detail: { ready: true },
              })
            );
          } catch (e) {
            console.error("[PWA] Failed to dispatch offline ready event:", e);
          }
          // }
        }
      },
      onRegisterError: (error) => {
        console.error("[PWA] Registration failed:", error);
        if (window.liveSocket) {
          try {
            window.dispatchEvent(
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

    updateSWFunction = registerSW(swOptions);
    return true;
  } catch (error) {
    console.error("[PWA] Failed to load PWA module:", error);
    return false;
  }
}

export function updateServiceWorker() {
  return updateSWFunction?.();
}
