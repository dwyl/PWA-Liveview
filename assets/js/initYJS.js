export default async function initYJS() {
  console.log("initYJS-----");
  const Y = await import("yjs");
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const storeName = "cart-store";
  const ydoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(storeName, ydoc);
  await persistence.whenSynced; // Wait until the state is fully loaded
  return ydoc;
}
