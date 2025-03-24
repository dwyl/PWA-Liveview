export async function RenderVForm() {
  const { FormVComponent } = await import("./formVComp.jsx");
  return FormVComponent({
    el: document.getElementById("select_form"),
    _this: null,
  });
}
