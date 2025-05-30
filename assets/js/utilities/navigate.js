import { appState, setAppState } from "@js/stores/AppStore.js";
import { CONFIG } from "@js/main";

const { CONTENT_SELECTOR: selector, hooks } = CONFIG;

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
      import: () => import("@jsx/components/pgStock.jsx"),
      args: (el) => ({
        el,
        ydoc: appState.globalYdoc,
        max: Number(localStorage.getItem("max")),
        userID: localStorage.getItem("userID"),
      }),
      assign: async (instance) => {
        return (offlineComponents.PgStockHook = await instance);
      },
      // special case when the component is SSR/Liveview and needs to be cleaned up before the Solid component mounts
      before: () => {
        const lvPgForm = document.getElementById("lv-pg-form");
        if (lvPgForm) lvPgForm.innerHTML = "";
      },
    },
  ],
  // single hook renders a Solidjs component in the view
  yjsChHook: [
    {
      id: hooks.StockYjsChHook,
      component: "YjsStock",
      import: () => import("@jsx/components/yjsStock.jsx"),
      args: (el) => ({
        el,
        ydoc: appState.globalYdoc,
        max: Number(localStorage.getItem("max")),
        userID: localStorage.getItem("userID"),
      }),
      assign: async (instance) =>
        (offlineComponents.StockYjsChHook = await instance),
    },
  ],
  // multiple hooks in the same view
  mapView: [
    // the form is a SolidJS component
    {
      id: hooks.FormHook,
      component: "CitiesForm",
      import: () => import("@jsx/components/citiesForm.jsx"),
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
        // work around for Laflet (re)mounting
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
      const domId = CONFIG.hooks[key];
      const domElt = document.getElementById(domId);
      if (domElt && typeof appState.hooks[key].destroyed === "function") {
        console.log("to offline: [", key, "] existing cleaned");
        appState.hooks[key].destroyed();
        domElt.innerHTML = "";
      }
    }
  }
  setAppState("hooks", null);
}

function cleanupOfflineComponents() {
  for (const [key, cleanupFn] of Object.entries(offlineComponents)) {
    if (cleanupFn) cleanupFn();
    offlineComponents[key] = null;
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
    const link = event.currentTarget;
    const path = link.getAttribute("data-path") || link.getAttribute("href");

    // Update URL without page reload
    window.history.pushState({ path }, "", path);

    // Try to get the page from cache via fetch
    const response = await fetch(path);
    if (!response.ok)
      throw new Error(`Failed to fetch ${path}: ${response.status}`);

    const html = await response.text();
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContent = doc.querySelector(selector);
    if (!newContent)
      throw new Error(`Main content element not found in fetched HTML`);

    // Replace only the main content, not the entire body
    const currentContent = document.querySelector(selector);
    if (currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
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
};
