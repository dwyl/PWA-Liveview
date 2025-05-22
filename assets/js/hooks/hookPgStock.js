export const PgStockHook = {
  mounted() {
    this.handleEvent("pg-update", ({ count }) =>
      localStorage.setItem("pg-count", count)
    );
  },
  destroyed() {},
};
