export default async function initYJS() {
  const Y = await import("yjs");
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const storeName = "cart-store";
  const ydoc = new Y.Doc();
  const provider = new IndexeddbPersistence(storeName, ydoc);
  await provider.whenSynced; // Wait until the state is fully loaded
  return ydoc;
}
