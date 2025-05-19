import { CONFIG, AppState } from "@js/main";

const offlineComponents = {
  stock: null,
  map: null,
  form: null,
};

function attachNavigationListeners() {
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    link.removeEventListener("click", handleOfflineNavigation);
    link.addEventListener("click", handleOfflineNavigation);
  });
}

async function renderCurrentView() {
  await cleanupOfflineComponents();

  const elStock = document.getElementById("stock_y");
  if (elStock) {
    const { displayStock } = await import("@js/components/renderers");
    offlineComponents.stock = await displayStock({
      ydoc: AppState.globalYdoc,
      el: elStock,
    });
  }

  const elMap = document.getElementById("map");
  const elForm = document.getElementById("select_form");

  if (elMap && elForm) {
    const { displayMap, displayForm } = await import(
      "@js/components/renderers"
    );
    offlineComponents.map = await displayMap();
    offlineComponents.form = await displayForm(elForm);
  }
  return true;
}

export { renderCurrentView, attachNavigationListeners };

async function cleanupOfflineComponents() {
  // Cleanup Stock SolidJS component
  if (offlineComponents.stock) {
    try {
      offlineComponents.stock();
    } catch (error) {
      console.error("Error cleaning up Stock component:", error);
    }
    offlineComponents.stock = null;
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
  // console.log("handling Offline Navigation");
  try {
    event.preventDefault();
    const link = event.currentTarget;
    const path = link.getAttribute("data-path") || link.getAttribute("href");

    // Update URL without page reload
    window.history.pushState({ path }, "", path);

    // Try to get the page from cache via fetch
    const response = await fetch(path);
    console.log(response);
    if (!response.ok)
      throw new Error(`Failed to fetch ${path}: ${response.status}`);

    const html = await response.text();
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const newContent = doc.querySelector(CONFIG.MAIN_CONTENT_SELECTOR);
    if (!newContent)
      throw new Error(`Main content element not found in fetched HTML`);

    // Replace only the main content, not the entire body
    const currentContent = document.querySelector(CONFIG.MAIN_CONTENT_SELECTOR);
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
