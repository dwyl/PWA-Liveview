/**
 * Initializes and configures a Yjs document with IndexedDB persistence.
 * Creates a shared document that automatically syncs with browser's IndexedDB storage.
 * Waits for the document to be fully loaded from storage before returning.
 *
 * @async
 * @function initYDoc
 * @returns {Promise<Y.Doc>} A fully synchronized Yjs document instance
 * @throws {Error} When Yjs or IndexedDB initialization fails
 *
 * @description
 * This function sets up a complete Yjs document with local persistence:
 * 1. Dynamically imports Yjs and IndexedDB persistence provider
 * 2. Creates a new Yjs document instance
 * 3. Configures IndexedDB persistence with store name "app-store"
 * 4. Waits for the document to synchronize with existing IndexedDB data
 * 5. Returns the fully loaded document ready for collaborative editing
 *
 * The returned document can be used for real-time collaborative data structures
 * like Y.Map, Y.Array, Y.Text, etc., with automatic local persistence.
 *
 * @example
 * const ydoc = await initYDoc();
 * const sharedMap = ydoc.getMap('shared-data');
 * sharedMap.set('key', 'value');
 */
export async function initYDoc() {
  const Y = await import("yjs");
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const storeName = "app-store";
  const ydoc = new Y.Doc();
  const provider = new IndexeddbPersistence(storeName, ydoc);
  await provider.whenSynced; // Wait until the state is fully loaded
  // console.log("Yjs initialized...");
  return ydoc;
}
