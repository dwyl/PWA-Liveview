// // assets/js/hooks/hookClearCache.js

// export const ClearCacheHook = {
//   async mounted() {
//     console.log("[ClearCacheHook] mounted");
//     const { clearApplicationCaches } = await import(
//       "@js/utilities/cacheManager"
//     );
//     // this.originalHTML = this.el.innerHTML;
//     this.handleClick = async () => {
//       if (this.el.disabled) {
//         return;
//       }

//       this.el.disabled = true;
//       this.el.textContent = "Clearing, please wait...";

//       const confirmation = window.confirm(
//         "You are going to clear the client cache. Reset now?"
//       );
//       if (confirmation) {
//         await clearApplicationCaches();
//       }

//       // this.el.disabled = false;
//       // this.el.innerHTML = this.originalHTML;
//       // it this true?
//     };

//     this.el.addEventListener("click", this.handleClick);
//   },
//   // destroyed() {
//   //   if (this.handleClick) {
//   //     this.el.removeEventListener("click", this.handleClick);
//   //   }
//   //   this.el.disabled = false;
//   //   this.el.innerHTML = this.originalHTML;
//   //   console.log("[ClearCacheHook] destroyed");
//   // },
// };
