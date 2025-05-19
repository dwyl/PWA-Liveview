// pwa-registration.js
// Central module for PWA and Service Worker registration
import { AppState } from "@js/main";
let updateSWFunction = null;

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  console.log("registerServiceWorker------");

  try {
    const { registerSW } = await import("virtual:pwa-register");
    updateSWFunction = registerSW({
      immediate: true, // Register immediately in the app.js context
      onNeedRefresh: () => {
        console.log("[SW] New version available");
        if (window.liveSocket) {
          try {
            window.dispatchEvent(
              new CustomEvent("sw-update", {
                detail: { update: true },
              })
            );
          } catch (e) {
            console.error("[SW] Failed to dispatch update event:", e);
          }
        }
      },
      onOfflineReady: () => {
        if (window.liveSocket) {
          console.log("[SW] Ready, app now works offline");
          try {
            window.dispatchEvent(
              new CustomEvent("sw-ready", {
                detail: { ready: true },
              })
            );
          } catch (e) {
            console.error("[SW] Failed to dispatch offline ready event:", e);
          }
          // }
        }
      },
      onRegisterError: (error) => {
        console.error("[SW] Registration failed:", error);
        if (window.liveSocket) {
          try {
            window.dispatchEvent(
              new CustomEvent("sw-error", {
                detail: { error: error.toString() },
              })
            );
          } catch (e) {
            console.error(
              "[SW] Failed to dispatch registration error event:",
              e
            );
          }
        }
      },
    });

    return updateSWFunction;
  } catch (error) {
    console.error("[PWA] Failed to load PWA module:", error);
    return false;
  }
}

export function updateServiceWorker() {
  if (AppState.updateSWFunction) {
    AppState.updateSWFunction();
  }
}
