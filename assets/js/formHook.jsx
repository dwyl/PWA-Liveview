import { render } from "solid-js/web";
import { createSignal } from "solid-js";

export const formHook = (ydoc, userID) => ({
  destroyed() {
    console.warn("form destroyed");
  },
  async mounted() {
    // const [progressCount, setProgressCount] = createSignal(0);
    const [cities, setCities] = createSignal([]);
    // const [lock, setLock] = createSignal(false);
    const [isInitialized, setIsInitialized] = createSignal(false);

    const airportsMap = ydoc.getMap("airports");
    this.handleEvent("airports", ({ airports }) => {
      console.log(airports);
      // airports.forEach((airport) => {
      //   const municipality = Object.keys(airport)[0];
      //   airportsMap.set(municipality, airport[municipality]);
      // });
      const airportsObject = airports.reduce((acc, airport) => {
        // Get the municipality name (the only key in the object)
        const municipality = Object.keys(airport)[0];
        acc[municipality] = airport[municipality];
        return acc;
      }, {});
      // airportsMap.set(airportsObject);
      // const airportsObject = Array.isArray(airports)
      //   ? airports.reduce((acc, airport) => {
      //       acc[airport.municipality] = {
      //         lat: airport.lat,
      //         long: airport.long,
      //       };
      //       return acc;
      //     }, {})
      //   : airports;

      airportsMap.set(airportsObject);
    });

    const _this = this;

    // createEffect(() => {
    airportsMap.observe((event) => {
      console.log(event.changes);
      const entries = [...airportsMap.entries()];
      setCities(entries[0][0]);
      setIsInitialized(true);
    });
    // });

    // const { ProgressCircle } = await import("./progressCircle");
    const { FormCities } = await import("./formCities");

    // const handleClick = () => {
    //   console.log("clicked");
    //   _this.pushEvent("download_evt", {});
    // };

    function handleSelect(city, { latitude, longitude }) {
      const selectionMap = ydoc.getMap("selection");
      selectionMap.set({ [city]: { latitude, longitude } });
      console.log(`Selected ${city} at ${latitude}, ${longitude}`);
    }
    render(
      () => (
        <>
          {isInitialized() ? (
            <FormCities
              cities={cities()}
              onSelect={handleSelect}

              // onDownload={handleClick}
              // progress={progressCount()}
            />
          ) : (
            <div class="loading">Loading airports data...</div>
          )}
        </>
      ),
      _this.el
    );
  },
});

export function RenderForm() {}

/*
this.handleEvent("push_download", ({ progress }) => {
  setProgressCount(progress);
  if (progress > 99.9) setLock(false);
});
<ProgressCircle
  width="60"
  height="60"
  progress={progressCount()}
  color="midnightblue"
/>
<button
  class="px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
  disabled={lock()}
  onClick={handleClick}
>
  Download airports
</button>
*/
