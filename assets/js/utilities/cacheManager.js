export async function clearApplicationCaches() {
  console.log("Start clearing");
  let sw = false,
    cache = false;

  console.log("indexedDB" in window, navigator.serviceWorker, caches);

  const regs = await navigator.serviceWorker.getRegistrations();
  console.log(regs);
  for (const reg of regs) {
    await reg.unregister();
  }
  sw = true;
  console.log(sw);

  const keys = await caches.keys();
  console.log(keys);
  await Promise.all(keys.map((key) => caches.delete(key)));
  cache = true;
  console.log(cache);

  localStorage.clear();

  sessionStorage.clear();

  // const dbs = await indexedDB.databases();
  // console.log(dbs);
  // for (const db of dbs) {
  //   await new Promise((resolve, reject) => {
  //     const req = indexedDB.deleteDatabase(db.name);
  //     req.onsuccess = resolve;
  //     req.onerror = reject;
  //   });
  // }
  // ind = true;
  // console.log(ind);

  if (sw && cache) {
    window.alert(
      "Service Workers unregistered, Cache API caches, localStorage, sessionStorage and IndexedDB cleared"
    );
  } else {
    window.alert("Not all cleared");
  }
}
