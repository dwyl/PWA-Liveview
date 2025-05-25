import { AppState } from "@js/main";

const offlineComponents = {
    pgStock: null,
    yjsStock: null,
    map: null,
    form: null,
  },
  hooksIDs = {
    pgStock: "hook-pg",
    yjsStock: "hook-yjs-sql3",
    map: "hook-map",
    mapForm: "hook-select-form",
  },
  contentSelector = "#main-content";

function attachNavigationListeners() {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleOfflineNavigation);
    link.addEventListener("click", handleOfflineNavigation);
  });
}

async function renderCurrentView() {
  await cleanupOfflineComponents();

  const elPgStock = document.getElementById(hooksIDs.pgStock);
  if (elPgStock) {
    const lvPgForm = document.getElementById("lv-pg-form");
    if (lvPgForm) lvPgForm.remove();
    // const hookDiv = document.getElementById("hook-pg");
    // hookDiv.classList.remove("hidden");

    const { PgStock } = await import("@jsx/components/pgStock.jsx");
    offlineComponents.pgStock = PgStock({
      el: elPgStock,
      ydoc: AppState.globalYdoc,
      max: Number(localStorage.getItem("max")),
      userID: localStorage.getItem("userID"),
    });

    // return to clean component
    return offlineComponents.pgStock;
  }

  const elYjsStock = document.getElementById(hooksIDs.yjsStock);
  if (elYjsStock) {
    const { YjsStock } = await import("@jsx/components/yjsStock.jsx");
    offlineComponents.yjsStock = YjsStock({
      el: elYjsStock,
      ydoc: AppState.globalYdoc,
      max: Number(localStorage.getItem("max")),
      userID: localStorage.getItem("userID"),
    });

    return true;
  }

  const elMap = document.getElementById(hooksIDs.map);
  const elForm = document.getElementById(hooksIDs.mapForm);

  if (elMap && elForm) {
    const { renderMap } = await import("@js/components/renderMap.js");
    console.log(renderMap);
    offlineComponents.map = await renderMap();

    const { CitiesForm } = await import("@jsx/components/citiesForm.jsx");
    offlineComponents.form = CitiesForm({
      el: elForm,
      _this: null,
      userID: localStorage.getItem("userID"),
    });
    return true;
  }
}

async function cleanupOfflineComponents() {
  if (offlineComponents.yjsStock) {
    try {
      offlineComponents.yjsStock();
    } catch (error) {
      console.error("Error cleaning up YjsStock component:", error);
    }
    offlineComponents.yjsStock = null;
  }

  if (offlineComponents.pgStock) {
    try {
      offlineComponents.pgStock();
    } catch (error) {
      console.error("Error cleaning up PgStock component:", error);
    }
    offlineComponents.pgStock = null;
  }

  // Cleanup Leaflet map
  if (offlineComponents.map) {
    try {
      offlineComponents.map();
    } catch (error) {
      console.error("Error cleaning up Map component:", error);
    }
    offlineComponents.map = null;
  }

  // Cleanup Form SolidJS component
  if (offlineComponents.form) {
    try {
      offlineComponents.form();
    } catch (error) {
      console.error("Error cleaning up Form component:", error);
    }
    offlineComponents.form = null;
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

export { renderCurrentView, attachNavigationListeners };
