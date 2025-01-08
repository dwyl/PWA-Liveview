import { render } from "solid-js/web";
import { createSignal } from "solid-js";

export const formHook = (ydoc) => ({
  selections: new Map(),
  destroyed() {
    console.warn("form destroyed");
  },
  async mounted() {
    const [cities, setCities] = createSignal([]);
    const [isInitialized, setIsInitialized] = createSignal(false);

    const airportsMap = ydoc.getMap("airports");
    // save airports list into y-indexeddb
    this.handleEvent("airports", ({ airports }) => {
      airportsMap.set("locations", airports);
    });

    const _this = this;

    // update signals when ydoc detects a change and set ready to display
    airportsMap.observe(() => {
      const entries = [...airportsMap.values()][0];
      setCities(entries);
      setIsInitialized(true);
    });

    const { FormCities } = await import("./formCities");

    // save the stores:
    // selection (depending on the inputType) in y-indexedDB
    // local variable "selections"
    // and signal MarkedSelections
    function handleSelect({ city, latitude, longitude }, inputType) {
      const selection = {
        city,
        latitude,
        longitude,
        inputType,
        userID: sessionStorage.getItem("userID"),
      };

      console.log(selection.userID);

      _this.selections.set(inputType, selection);

      const selectionMap = ydoc.getMap("selection");
      selectionMap.set(inputType, selection);
      console.log(
        `User ${selection.userID} selected ${city} at ${latitude}, ${longitude}`
      );
    }

    // update the stores
    function handleReset(inputType) {
      const selectionMap = ydoc.getMap("selection");
      selectionMap.delete(inputType);
      _this.selections.delete(inputType);
    }

    // form is submitted with two inputs
    function handleSubmit(e) {
      e.preventDefault();
      // Validate that both forms have selections
      if (_this.selections.size !== 2) {
        console.warn("Please select both departure and arrival cities");
        return;
      }

      const [departure, arrival] = [..._this.selections.values()];
      const flightMap = ydoc.getMap("flight");
      flightMap.set("flight", {
        departure: [departure.latitude, departure.longitude],
        arrival: [arrival.latitude, arrival.longitude],
      });
      console.log("Flying from", departure.city, "to", arrival.city);

      // You can emit an event to Phoenix LiveView here
      // _this.pushEvent("flight_selected", { departure, arrival });
    }

    render(
      () => (
        <>
          {isInitialized() ? (
            <form onSubmit={handleSubmit}>
              <FormCities
                cities={cities()}
                onSelect={handleSelect}
                onReset={handleReset}
                inputType="departure"
                label="departure City"
              />
              <FormCities
                cities={cities()}
                onSelect={handleSelect}
                onReset={handleReset}
                inputType="arrival"
                label="arrival City"
              />
              <button
                class="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
                type="submit"
              >
                Fly!
              </button>
            </form>
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
