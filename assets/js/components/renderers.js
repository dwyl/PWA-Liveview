export async function displayMap() {
  console.log("[Map] Offline render-----");
  try {
    const { renderMap } = await import("@js/components/renderMap.js");
    return await renderMap();
  } catch (error) {
    console.error("Error rendering map:", error);
  }
}

export async function displayForm(el) {
  console.log("[Form] Offline render -----");
  try {
    const { CitiesForm } = await import("@jsx/components/citiesForm.jsx");
    return CitiesForm({
      el,
      _this: null,
      userID: localStorage.getItem("userID"),
    });
  } catch (err) {
    console.error("Error rendering form:", err);
  }
}

export async function displayStock({ ydoc, el }) {
  console.log("[Stock] Offline render -----");
  try {
    const { Stock } = await import("@jsx/components/stock.jsx");
    return Stock({
      ydoc,
      userID: localStorage.getItem("userID"),
      el,
    });
  } catch (error) {
    console.error("Error rendering stock:", error);
  }
}
