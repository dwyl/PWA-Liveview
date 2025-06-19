// pwa-registration.js
// Central module for PWA and Service Worker registration
import { pwaRegistry } from "@js/main";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    const updateSWFunction = registerSW({
      immediate: true, // Register immediately in the main.js context

      onOfflineReady: () => {
        console.log("[SW] Ready, app now works offline");
        window.dispatchEvent(
          new CustomEvent("sw-ready", {
            detail: { ready: true },
          })
        );
      },

      onNeedRefresh: () => {
        console.log("[SW] New version available");
        // localStorage.setItem("pwa_update_available", "1");
        if (window.liveSocket) {
          window.dispatchEvent(
            new CustomEvent("sw-update", {
              detail: { update: true },
            })
          );
        }
      },

      onRegisterError: (error) => {
        console.error("[SW] Registration failed:", error);
        if (window.liveSocket) {
          window.dispatchEvent(
            new CustomEvent("sw-error", {
              detail: { error: error.toString() },
            })
          );
        }
      },
    });

    console.log("[SW registered] ------");

    return (pwaRegistry.updateSW = updateSWFunction);
  } catch (error) {
    console.error("[PWA] Failed to load PWA module:", error);
    return false;
  }
}
