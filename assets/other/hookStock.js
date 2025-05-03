// import { Stock } from "@jsx/solid_components/stock";
// import * as Y from "yjs";
// import { checkServer } from "@js/utilities/checkServer";
// import { encodeBase64, decodeBase64 } from "@js/utilities/base64Utils";

// export const StockHook = (ydoc) => ({
//   destroyed() {
//     if (ydoc) {
//       ydoc.off("update", this.handleYUpdate);
//     }

//     if (this.cleanupSolid) {
//       this.cleanupSolid();
//       this.cleanupSolid = null;
//       console.log("cleanupSolid");
//     }

//     if (this.connectionCheckInterval) {
//       clearInterval(this.connectionCheckInterval);
//     }
//     console.log("[StockHook] destroyed -------");
//   },
//   updated() {
//     console.log("[StockHook] ~~~~~~~~~~~> updated");

//     if (this.cleanupSolid) {
//       this.cleanupSolid();
//     }

//     this.cleanupSolid = Stock({
//       el: this.el,
//       ydoc: ydoc,
//       userID: Number(this.el.dataset.userid),
//       max: sessionStorage.getItem("max"),
//     });
//   },

//   async mounted() {
//     this.userID = Number(this.el.dataset.userid);

//     if (this.cleanupSolid) {
//       console.log("calling cleanupSolid in Mounted");
//       this.cleanupSolid();
//       this.cleanupSolid = null;
//     } // defensive cleanup

//     // we need to set the userID in localStorage
//     // so that the Solid component can access it when offline
//     if (!localStorage.getItem("userID")) {
//       localStorage.setItem("userID", this.userID);
//     }

//     if (!sessionStorage.getItem("max")) {
//       sessionStorage.setItem("max", Number(this.el.dataset.max));
//       this.max = sessionStorage.getItem("max");
//     }

//     this.ymap = ydoc.getMap("stock");
//     this.isOnline = null;
//     this.pendingSync = false;
//     this.cleanupSolid = null;
//     this.lastConnectionStatus = false;

//     this.handleYUpdate = this.handleYUpdate.bind(this);
//     this.handleInitStock = this.handleInitStock.bind(this);
//     this.handleServerSync = this.handleServerSync.bind(this);
//     this.handleSyncFromServer = this.handleSyncFromServer.bind(this);
//     this.handleReconnection = this.handleReconnection.bind(this);

//     // display the Solid component

//     // ---- Yjs listener on updates -----
//     ydoc.on("update", this.handleYUpdate);
//     // ---- Phoenix Event: Initial state from server ----
//     this.handleEvent("init_stock", this.handleInitStock);
//     // ---- Phoenix Event: Sync state from server ----
//     this.handleEvent("sync_from_server", this.handleSyncFromServer);

//     this.isOnline = await checkServer();
//     this.lastConnectionStatus = this.isOnline;
//     console.log("isOnline", this.isOnline);

//     if (window.liveSocket.socket.isConnected()) {
//       console.log("[StockHook] ~~~~~~~~~~~> mounted");
//       return (this.cleanupSolid = Stock({
//         ydoc,
//         el: this.el,
//         userID: this.userID,
//       }));
//     }
//     // test ---
//     console.log("not connected", window.liveSocket.socket.isConnected());
//     return;
//   },
//   handleInitStock({ db_value, db_state }) {
//     console.log("handleInitStock", db_value, db_state.length);
//     const localValue = this.ymap.get("stock-value");
//     if (localValue === undefined) {
//       // Yjs is empty: client first connection
//       if (db_state.length === 0) {
//         // no vector state in the server we set the initial value from the server and handleYUpdate will be triggered
//         console.log("Yjs is empty and db_state is empty");
//         try {
//           ydoc.transact(() => {
//             this.ymap.set("stock-value", db_value);
//           }, "init");
//         } catch (e) {
//           console.error("Error setting initial value in Yjs:", e);
//         }
//       } else {
//         // vector state in the server. we pass it to Yjs  and handleYUpdate will be triggered
//         console.log("Yjs is empty and db_state is not empty");
//         const decoded = decodeBase64(db_state);
//         return Y.applyUpdate(ydoc, decoded, "init");
//       }
//     } else {
//       //  Yjs is not empty:  client reconnects. server maybe out of sync, so we may need to update the server  as the local value may be different from the server value
//       console.log("Yjs is not empty");
//       return this.handleServerSync({
//         value: db_value,
//         sender: "init",
//       });
//     }
//   },
//   handleServerSync({ value, sender }) {
//     const { send, localUpdate, newValue } = this.needsUpdate(value, sender);

//     // server is behind the client
//     if (send) {
//       console.log("sending to server");
//       if (this.isOnline) {
//         return this.pushToServer(newValue, this.userID);
//       } else {
//         console.log("pendingSync is true");
//         return (this.pendingSync = true);
//       }
//     }
//     // server is ahead of the client
//     // we need to update the client
//     if (localUpdate) {
//       if (this.isOnline) {
//         const currentValue = this.ymap.get("stock-value");

//         if (currentValue !== newValue) {
//           console.log("objects are different, updating client");
//           return ydoc.transact(() => {
//             this.ymap.set("stock-value", newValue);
//           }, this.userID);
//         }
//       } else {
//         console.log("pendingSync is true");
//         return (this.pendingSync = true);
//       }
//     }
//   },

//   handleSyncFromServer({ value: dbValue, sender }) {
//     const { send, newValue, localUpdate } = this.needsUpdate(dbValue, sender);
//     console.log(
//       this.userID,
//       "received handleSyncWithServer from ",
//       sender,
//       "with ext_value ",
//       dbValue,
//       ". NeedsUpdate ",
//       send,
//       localUpdate,
//       "with value ",
//       dbValue
//     );
//     if (localUpdate) {
//       const currentValue = this.ymap.get("stock-value");

//       if (currentValue !== newValue) {
//         ydoc.transact(() => {
//           this.ymap.set("stock-value", newValue);
//         }, this.userID);
//       }
//     }
//   },

//   // the "on" listener callback, reacts for self or other users
//   async handleYUpdate(_update, origin) {
//     console.log("handleYUpdate", origin);
//     const wasOnline = this.isOnline;
//     this.isOnline = await checkServer();

//     if (wasOnline && !this.isOnline) {
//       this.pendingSync = true;
//       return;
//     }

//     if (this.isOnline) {
//       this.pendingSync = false;
//       // check if server needs update as the client may be out of sync
//       const value = this.ymap.get("stock-value");
//       console.log(
//         this.userID,
//         "is Online - can sync with server from ",
//         origin,
//         value
//       );
//       // const state = Y.encodeStateAsUpdate(ydoc);
//       return this.handleServerSync({ value, sender: origin });
//     } else {
//       console.log(
//         this.userID,
//         "is Offline - will sync on reconnection from: ",
//         origin
//       );
//       this.pendingSync = true;
//       return;
//     }
//   },
//   needsUpdate(value, origin) {
//     console.log("needsUpdate origin", origin, value);
//     const localValue = ydoc.getMap("stock").get("stock-value") ?? Infinity;

//     // self update to be sent to server
//     if (origin === this.userID) {
//       console.log("origin is the userID", origin, value);
//       return { send: true, newValue: localValue, localUpdate: false };
//     }
//     // Case 1: Update coming from init
//     if (origin == "init") {
//       if (value >= localValue) {
//         console.log(origin, true, localValue, value, false);
//         return { send: true, newValue: localValue, localUpdate: false };
//       } else {
//         console.log(origin, false, localValue, value, true);
//         return { send: false, newValue: value, localUpdate: true };
//       }
//     }

//     // Case 2: Update coming from another user
//     if (value > localValue) {
//       console.log(origin, true, localValue, value, false);
//       return { send: true, newValue: localValue, localUpdate: false };
//     } else {
//       console.log(origin, false, localValue, value, true);
//       return { send: false, newValue: value, localUpdate: true };
//     }
//   },
//   // Sends local state to the server
//   pushToServer(value, sender) {
//     const update = Y.encodeStateAsUpdate(ydoc);
//     const encodedUpdate = encodeBase64(update);

//     this.pushEvent("sync_from_client", {
//       value,
//       b64_state: encodedUpdate,
//       sender,
//     });
//   },
//   async handleReconnection() {
//     if (!this.pendingSync) return;

//     // console.log("Reconnected - syncing with server");
//     this.online = await checkServer();

//     if (this.online && this.pendingSync) {
//       // console.log("Reconnected - syncing with server");
//       const value = this.ymap.get("stock-value");
//       // const update = Y.encodeStateAsUpdate(ydoc);
//       this.pushToServer(value, this.userID);
//       this.pendingSync = false;
//     }
//   },
// });
