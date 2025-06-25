import { appState, setAppState } from "@js/stores/AppStore.js";

const { CONTENT_SELECTOR: selector, hooks } = appState.CONFIG;
// instantiate when the user goes offline
const offlineComponents = {
  PgStockHook: null,
  StockYjsChHook: null,
  MapHook: null,
  FormHook: null,
};

const components = {
  // substitue the LV rendered DOM with the rendered SolidJS component and use the 'before' cleanup
  pgStockHook: [
    {
      id: hooks.PgStockHook,
      component: "PgStock",
      import: () => import("@js/components/pgStock"),
      args: (el) => ({
        el,
        ydoc: appState.globalYdoc,
        max: Number(localStorage.getItem("max")),
        userID: localStorage.getItem("userID"),
        inv: true, // inverse style
      }),
      assign: async (instance) => {
        return (offlineComponents.PgStockHook = await instance);
      },
      // special case when the component is SSR/Liveview and needs to be cleaned up before the Solid component mounts
      before: () => {
        const lvPgHook = document.getElementById("phx-sync-count");
        if (lvPgHook) lvPgHook.remove();
      },
    },
  ],
  // single hook renders a Solidjs component in the view
  yjsChHook: [
    {
      id: hooks.StockYjsChHook,
      component: "YjsStock",
      import: () => import("@js/components/yjsStock"),
      args: (el) => ({
        el,
        ydoc: appState.globalYdoc,
        max: Number(localStorage.getItem("max")),
        userID: localStorage.getItem("userID"),
        inv: true, // inverse style
      }),
      assign: async (instance) =>
        (offlineComponents.StockYjsChHook = await instance),
      before: () => {
        const lvYjsHook = document.getElementById("hook-yjs-sql3");
        if (lvYjsHook) lvYjsHook.innerHTML = "";
      },
    },
  ],
  // multiple hooks in the same view
  mapView: [
    // the form is a SolidJS component
    {
      id: hooks.FormHook,
      component: "CitiesForm",
      import: () => import("@js/components/citiesForm"),
      args: (el) => ({
        el,
        _this: null,
        userID: localStorage.getItem("userID"),
      }),
      assign: async (instance) => (offlineComponents.FormHook = await instance),
    },
    // the map is not rendered as a Solidjs component but vanilla JS - Leaflet
    {
      id: hooks.MapHook,
      component: "renderMap",
      import: () => import("@js/components/renderMap.js"),
      args: () => ({
        id: hooks.MapHook,
      }),
      assign: async (instance) => (offlineComponents.MapHook = await instance),
    },
  ],
};

async function mountOfflineComponents() {
  const results = [];

  for (const key in components) {
    const config = components[key];
    const allPresent = config.every((compConf) =>
      document.getElementById(compConf.id)
    );
    // run only the components that are present in the DOM
    // there can be several components in the same view, eg mapView
    if (allPresent) {
      for (const compConf of config) {
        const el = document.getElementById(compConf.id);
        if (compConf.before) compConf.before();
        const module = await compConf.import();
        const Component = module[compConf.component];
        const args = compConf.args(el);
        // work around for Leaflet (re)mounting
        try {
          const instance = await Component(args);
          if (compConf.assign) await compConf.assign(instance);
          console.log("[", Object.keys(module), "] mounted");
          results.push(instance);
        } catch (error) {
          console.warn(error);
        }
      }
      return results;
    }
  }
  return results.length ? results : undefined;
}

function cleanExistingHooks() {
  if (appState.hooks === null) return;

  for (const key in appState.hooks) {
    if (key !== "MapHook") {
      const domId = hooks[key];
      const domElt = document.getElementById(domId);
      if (domElt && typeof appState.hooks[key].destroyed === "function") {
        appState.hooks[key].destroyed();
        domElt.innerHTML = "";
        // domElt.remove();
        console.log("existing hook: [", key, "] cleaned");
      }
    }
  }
  setAppState("hooks", null);
}

function cleanupOfflineComponents() {
  for (const [key, cleanupFn] of Object.entries(offlineComponents)) {
    if (cleanupFn) {
      cleanupFn();
      offlineComponents[key] = null;
      // console.log("Offline component [", key, "] cleaned");
    }
  }
}

/*
Clean up existing components
Update the DOM structure with the cached HTML
Render the new components into the updated DOM
Reattach navigation listeners to handle future navigation
*/
async function handleOfflineNavigation(event) {
  try {
    event.preventDefault();
    const path = event.currentTarget.href;
    // const path = link.getAttribute("data-path") || link.getAttribute("href");
    // const normPath = new URL(path, window.location.origin).pathname;

    window.history.pushState({ path }, "", path);

    const cache = await caches.open("page-shells");
    const response = await cache.match(path);

    if (!response) {
      throw new Error(`No cached content found for ${path}`);
    }

    if (!response.ok)
      throw new Error(`Failed to fetch ${path}: ${response.status}`);

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const cachedContent = doc.querySelector(selector);
    if (!cachedContent)
      throw new Error(`Main content element not found in fetched HTML`);

    // Replace only the main content, not the entire body
    const currentContent = document.querySelector(selector);
    if (currentContent) {
      currentContent.innerHTML = cachedContent.innerHTML;
      cleanupOfflineComponents();
      await mountOfflineComponents();
      return attachNavigationListeners();
    }
  } catch (error) {
    console.error("Offline navigation error:", error);
    return false;
  }
}

function attachNavigationListeners() {
  // disable the home link
  const home = document.getElementById("login-link");
  if (home) {
    home.addEventListener("click", (e) => e.preventDefault());
    home.removeAttribute("href");
  }

  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleOfflineNavigation);
    link.addEventListener("click", handleOfflineNavigation);
  });
}

export {
  cleanExistingHooks,
  mountOfflineComponents,
  attachNavigationListeners,
  addCurrentPageToCache,
};

async function addCurrentPageToCache(path) {
  await navigator.serviceWorker.ready;
  await new Promise((resolve) => setTimeout(resolve, 100));
  // const url = new URL(path, window.location.origin).pathname;

  const htmlContent = document.documentElement.outerHTML;
  const contentLength = new TextEncoder().encode(htmlContent).length;

  const response = new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": contentLength,
    },
    status: 200,
  });

  const cache = await caches.open("page-shells");
  return cache.put(path, response.clone());
}

// async function cacheCurrentPage() {
//   await navigator.serviceWorker.ready;
//   // const newPath = new URL(current).pathname;

//   const url = window.location.pathname;
//   const cache = await caches.open("page-shells");

//   try {
//     const response = await fetch(url, {
//       credentials: "same-origin",
//     });
//     if (response.ok) {
//       await cache.put(url, response.clone());
//       console.log(`[SW] Cached ${url}`);
//     }
//   } catch (e) {
//     console.warn(`[SW] Failed to cache ${url}:`, e);
//   }
// }

// async function debugCache() {
//   const cache = await caches.open("page-shells");
//   const keys = await cache.keys();
//   console.log(
//     "Cached URLs:",
//     keys.map((req) => req.url)
//   );
// }
