import { FormComponent } from "./formComp.jsx";

export const formHook = (ydoc) => ({
  selections: new Map(),
  userID: null,
  destroyed() {
    this.selections.clear();
    this.userID = null;
    const selectionMap = ydoc.getMap("selection");
    selectionMap.clear();
    console.log("Form destroyed-----");
  },
  mounted() {
    console.log("Form mounted----");
    this.userID = sessionStorage.getItem("userID");

    const airportsMap = ydoc.getMap("airports");
    // save airports list into y-indexeddb on first mount
    this.handleEvent("airports", ({ airports }) => {
      if (!airportsMap.has("locations")) {
        console.log("formHook set airports");
        airportsMap.set("locations", airports);
      }
    });

    this.handleEvent("added_airport", (airport) => {
      const selectionMap = ydoc.getMap("selection");
      if (
        (airport.action === "add" || airport.action === "update") &&
        this.userID !== airport.userID
      ) {
        selectionMap.set(airport.inputType, airport);
      }
    });

    FormComponent({ ydoc, el: this.el, s: this });
  },
});

export async function RenderForm(ydoc) {
  const { FormComponent } = await import("./formComp.jsx");
  console.log("Render Form-----", ydoc);
  const el = document.getElementById("select_form");
  return FormComponent({ ydoc, el, s: null });
}
