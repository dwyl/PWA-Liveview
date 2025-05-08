export async function initYDoc() {
  const Y = await import("yjs");
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const storeName = "app-store";
  const ydoc = new Y.Doc();
  const provider = new IndexeddbPersistence(storeName, ydoc);
  await provider.whenSynced; // Wait until the state is fully loaded
  console.log("Yjs initialized...");
  return ydoc;
}
