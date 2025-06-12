import { createSignal, batch } from "solid-js";
import { render } from "solid-js/web";

export const PgStock = ({ ydoc, max, el }) => {
  const ymap = ydoc.getMap("pg-data");

  const [localCounter, setLocalCounter] = createSignal(
    ymap.get("pg-count") || max
  );
  const [clicks, setClicks] = createSignal(ymap.get("clicks") || 0);

  const decrement = () => {
    const new_value = localCounter() == 0 ? max : localCounter() - 1;
    const new_clicks = clicks() + 1;
    batch(() => {
      setClicks(new_clicks);
      setLocalCounter(new_value);
      ymap.set("clicks", new_clicks);
      ymap.set("pg-count", new_value);
    });

    console.log("update ymap", ymap.toJSON());
  };

  // createEffect(() => {
  // const ymap = ydoc.getMap("pg-data");
  // setLocalCounter(Math.round(Number(ymap.get("pg-count"))) || max);
  // setClicks(Math.round(Number(ymap.get("clicks"))) || 0);
  // console.log("effect", localCounter(), clicks());
  // });

  // createEffect(() => {
  //   const ymap = props.ydoc.getMap("pg-data");
  //   console.log(ymap.get("pg-count"), ymap.get("clicks"), clicks());
  // });

  const dispose = render(
    () => (
      <>
        <form phx-submit="dec" onSubmit={decrement} id="sol-pg-form">
          <button class="rounded-lg bg-bisque hover:bg-midnightblue py-2 px-3 text-sm font-semibold leading-6 text-midnightblue hover:text-bisque active:text-bisque ">
            Decrement Stock
          </button>
          <input
            type="range"
            min="0"
            max={max}
            name="dec-pg-sync-counter"
            value={localCounter()}
            aria-label="displayed-pg-stock"
            disabled
          />
          <span class="ml-8">{localCounter()}</span>
        </form>
      </>
    ),
    el
  );

  return () => dispose();
};
