export async function configureTopbar() {
  const topbar = await import("topbar");
  topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
  window.addEventListener("phx:page-loading-start", (_info) => {
    topbar.show(300);
    document.body.style.cursor = "wait";
  });
  window.addEventListener("phx:page-loading-stop", (_info) => {
    document.body.style.cursor = "default";
    topbar.hide();
  });
}
