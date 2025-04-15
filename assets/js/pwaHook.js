// Track offline notification state at module level
let hasNotifiedOfflineReady = false;
const { registerSW } = await import("virtual:pwa-register");

export const PwaHook = {
  mounted() {
    const _this = this;
    console.log(
      "~~~~~~~~~~~>  PwaHook mounted",
      window.liveSocket?.socket?.isConnected()
    );

    this.updateAvailable = false;
    let updateSWFunction;

    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("Message from Service Worker:", event.data);
      });
    }

    // Register service worker
    const updateSW = registerSW({
      onNeedRefresh: () => {
        console.log("New version available");
        _this.updateAvailable = true;
        updateSWFunction = updateSW;

        // Let LiveView handle the button visibility
        _this.pushEvent("pwa-update-available", {
          updateAvailable: true,
        });
      },
      immediate: false, // Prevents immediate registration on page load
      onOfflineReady: () => {
        // Only notify once when service worker is first installed
        if (!hasNotifiedOfflineReady) {
          console.log("Service Worker installed - App ready for offline use");
          _this.pushEvent("pwa-offline-ready", {
            msg: "App ready for offline use",
          });
          hasNotifiedOfflineReady = true;
        }
      },
      onRegisterError: (error) => {
        console.error("SW registration error", error);
        _this.pushEvent("pwa-registration-error", {
          error: error.toString(),
        });
      },
    });
  },
};
// // Track offline notification state at module level
// let hasNotifiedOfflineReady = false;
// const { registerSW } = await import("virtual:pwa-register");

// export const PwaHook = {
//   mounted() {
//     console.log("PwaHook mounted");

//     this.updateAvailable = false;
//     let updateSWFunction = null;

//     if (navigator.serviceWorker) {
//       navigator.serviceWorker.addEventListener("message", (event) => {
//         console.log("Message from Service Worker:", event.data);
//       });
//     }

//     updateSWFunction = registerSW({
//       immediate: false, // Defer registration until PWAHook is mounted
//       onNeedRefresh: () => {
//         console.log("New version available");
//         this.pushEvent("pwa-update-available", {
//           updateAvailable: true,
//         });
//       },
//       onOfflineReady: () => {
//         if (!hasNotifiedOfflineReady) {
//           console.log("Service Worker installed - App ready for offline use");
//           this.pushEvent("pwa-offline-ready", {
//             msg: "App ready for offline use",
//           });
//           hasNotifiedOfflineReady = true;
//         }
//       },
//       onRegisterError: (error) => {
//         console.error("SW registration error", error);
//         this.pushEvent("pwa-registration-error", {
//           error: error.toString(),
//         });
//       },
//     });
//   },
// };
