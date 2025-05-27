import { AppState } from "@js/main";
import { CONFIG } from "@js/main";

const offlineComponents = {
    pgStock: null,
    yjsStock: null,
    map: null,
    form: null,
  },
  contentSelector = "#main-content";

const hooks = {
  // substitue the LV rendered DOM with the rendered SolidJS component and use the 'before' cleanup
  pgStock: {
    id: "hook-pg",
    import: () => import("@jsx/components/pgStock.jsx"),
    component: "PgStock",
    args: (el) => ({
      el,
      ydoc: AppState.globalYdoc,
      max: Number(localStorage.getItem("max")),
      userID: localStorage.getItem("userID"),
    }),
    assign: (instance) => (offlineComponents.pgStock = instance),
    // special case when the component is SSR/Liveview and needs to be cleaned up before the Solid component mounts
    before: () => {
      const lvPgForm = document.getElementById("lv-pg-form");
      if (lvPgForm) lvPgForm.remove();
    },
  },
  // single hook renders a Solidjs component in the view
  yjsStock: {
    id: "hook-yjs-sql3",
    import: () => import("@jsx/components/yjsStock.jsx"),
    component: "YjsStock",
    args: (el) => ({
      el,
      ydoc: AppState.globalYdoc,
      max: Number(localStorage.getItem("max")),
      userID: localStorage.getItem("userID"),
    }),
    assign: (instance) => (offlineComponents.yjsStock = instance),
  },
  // multiple hooks in the same view
  mapView: [
    // the map is not rendered as a Solidjs component but vanilla JS - Leaflet
    {
      id: "hook-map",
      import: () => import("@js/components/renderMap.js"),
      component: "renderMap",
      args: () => ({
        id: "hook-map",
      }),
      assign: async (instance) => (offlineComponents.map = await instance),
    },
    // the form is a SolidJS component
    {
      id: "hook-select-form",
      import: () => import("@jsx/components/citiesForm.jsx"),
      component: "CitiesForm",
      args: (el) => ({
        el,
        _this: null,
        userID: localStorage.getItem("userID"),
      }),
      assign: (instance) => (offlineComponents.form = instance),
    },
  ],
};

async function renderCurrentView() {
  await cleanupOfflineComponents();

  let results = [];

  for (const key in hooks) {
    const conf = hooks[key];
    if (Array.isArray(conf)) {
      const allPresent = conf.every((hookConf) =>
        document.getElementById(hookConf.id)
      );
      if (allPresent) {
        for (const hookConf of conf) {
          const el = document.getElementById(hookConf.id);
          if (hookConf.before) hookConf.before();
          const module = await hookConf.import();
          const Component = module[hookConf.component];
          const args = hookConf.args(el);
          const instance = Component(args);
          if (hookConf.assign) await hookConf.assign(instance);
          results.push(instance);
        }
        return results;
      }
    } else if (conf.id) {
      const el = document.getElementById(conf.id);
      if (el) {
        if (conf.before) await conf.before();
        const module = await conf.import();
        const Component = module[conf.component];
        const args = conf.args(el);
        const instance = Component(args);
        await conf.assign?.(instance);
        return instance;
      }
    }
  }
  return results.length ? results : undefined;
}

async function cleanupOfflineComponents() {
  for (const [key, cleanupFn] of Object.entries(offlineComponents)) {
    if (cleanupFn) cleanupFn();
    offlineComponents[key] = null;
  }
}

/*
Clean up existing components (to prevent memory leaks)
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
    const newContent = doc.querySelector(contentSelector);
    if (!newContent)
      throw new Error(`Main content element not found in fetched HTML`);

    // Replace only the main content, not the entire body
    const currentContent = document.querySelector(contentSelector);
    if (currentContent) {
      currentContent.innerHTML = newContent.innerHTML;
      await renderCurrentView();
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

export { renderCurrentView, attachNavigationListeners };
