import { render } from "solid-js/web";
import { createSignal } from "solid-js";

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
  async mounted() {
    console.log("Form mounted----");
    console.log("liveSocket", window.liveSocket?.isConnected());
    this.userID = sessionStorage.getItem("userID");
    const _this = this;

    const [cities, setCities] = createSignal([]);
    const [isInitialized, setIsInitialized] = createSignal(false);

    const [resetTrigger, setResetTrigger] = createSignal(false);

    const airportsMap = ydoc.getMap("airports");
    const selectionMap = ydoc.getMap("selection");
    // save airports list into y-indexeddb if needed
    this.handleEvent("airports", ({ airports }) => {
      // prefer reading from y-indexeddb
      if (!airportsMap.has("locations")) {
        airportsMap.set("locations", airports);
      } else {
        setCities([...airportsMap.values()][0]);
        setIsInitialized(true);
      }
    });

    this.handleEvent("deleted_airport", (airport) => {
      if (airport.action === "delete") {
        selectionMap.clear();
      }
    });

    this.handleEvent("added_airport", (airport) => {
      const selectionMap = ydoc.getMap("selection");
      if (
        airport.action === "add" ||
        (airport.action === "update" && this.userID !== airport.userID)
      ) {
        selectionMap.set(airport.inputType, airport);
      }
    });

    // on first load, y.js detects a change
    airportsMap.observe(() => {
      const entries = [...airportsMap.values()][0];
      setCities(entries);
      setIsInitialized(true);
    });

    // const _this = this;

    FormComponent({
      isInitialized,
      resetTrigger,
      setResetTrigger,
      ydoc,
      cities,
      setCities,
      selections: this.selections,
      el: this.el,
      s: _this,
    });

    /*
    const { FormCities } = await import("./formCities");

    // save the stores:
    // selection (depending on the inputType) in y-indexedDB
    // local variable "selections"
    // and signal MarkedSelections
    function handleSelect({ city, country, lat, lng }, inputType) {
      const selection = {
        city,
        country,
        lat,
        lng,
        inputType,
        userID: sessionStorage.getItem("userID"),
      };

      _this.selections.set(inputType, selection);
      const selectionMap = ydoc.getMap("selection");
      selectionMap.set(inputType, selection);
    }

    // update the stores
    function handleReset() {
      const selectionMap = ydoc.getMap("selection");
      selectionMap.clear();
      _this.selections.clear();
      setResetTrigger(true);
      // Reset the trigger after a short delay
      setTimeout(() => setResetTrigger(false), 100);
    }

    // form is submitted with two inputs
    function handleSubmit(e) {
      e.preventDefault();
      if (_this.selections.size !== 2) {
        console.warn("Please select both departure and arrival cities");
        return;
      }

      const [departure, arrival] = [..._this.selections.values()];
      const flightMap = ydoc.getMap("flight");
      flightMap.set("flight", {
        departure: [departure.lat, departure.lng],
        arrival: [arrival.lat, arrival.lng],
      });
    }

    render(
      () => (
        <>
          {isInitialized() ? (
            <form onSubmit={handleSubmit}>
              <FormCities
                cities={cities()}
                onSelect={handleSelect}
                resetTrigger={resetTrigger}
                inputType="departure"
                label="Departure City"
              />
              <FormCities
                cities={cities()}
                onSelect={handleSelect}
                resetTrigger={resetTrigger}
                inputType="arrival"
                label="Arrival City"
              />
              <div class="flex gap-4 mt-4">
                <button
                  class="px-4 py-2 bg-blue-500  rounded-lg hover:bg-blue-600"
                  type="submit"
                >
                  Fly!
                </button>
                <button
                  class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  type="button"
                  onClick={handleReset}
                >
                  Reset All
                </button>
              </div>
            </form>
          ) : (
            <div class="loading">Loading airports data...</div>
          )}
        </>
      ),
      _this.el
    );
    */
  },
});

export async function FormComponent(props) {
  const { FormCities } = await import("./formCities");
  console.log("inside FormComponent-----");
  const userID = sessionStorage.getItem("userID");

  function handleSelect({ city, country, lat, lng }, inputType) {
    const selection = {
      city,
      country,
      lat,
      lng,
      inputType,
      userID,
    };

    const selectionMap = props.ydoc.getMap("selection");
    props.selections.set(inputType, selection);
    selectionMap.set(inputType, selection);
  }

  // update the stores
  function handleReset() {
    const selectionMap = props.ydoc.getMap("selection");
    selectionMap.clear();
    props.selections.clear();
    props.setResetTrigger(true);
    // Reset the trigger after a short delay
    setTimeout(() => props.setResetTrigger(false), 100);
  }

  // form is submitted with two inputs
  function handleSubmit(e) {
    e.preventDefault();
    const selectionMap = props.ydoc.getMap("selection");

    if (props.selections.size !== 2) return;

    // console.log([...selectionMap.values()], [...props.selections.values()]);
    const [departure, arrival] = [...selectionMap.values()];
    const flightMap = props.ydoc.getMap("flight");
    flightMap.set("flight", {
      departure: [departure.lat, departure.lng],
      arrival: [arrival.lat, arrival.lng],
    });
    props.s.pushEvent("fly", { userID, departure, arrival });
  }

  render(
    () => (
      <>
        {props.isInitialized ? (
          <form onSubmit={handleSubmit}>
            <FormCities
              cities={props.cities()}
              onSelect={handleSelect}
              resetTrigger={props.resetTrigger}
              inputType="departure"
              label="Departure City"
            />
            <FormCities
              cities={props.cities()}
              onSelect={handleSelect}
              resetTrigger={props.resetTrigger}
              inputType="arrival"
              label="Arrival City"
            />
            <div class="flex gap-4 mt-4">
              <button
                class="px-4 py-2 bg-blue-500  rounded-lg hover:bg-blue-600"
                type="submit"
              >
                Fly!
              </button>
              <button
                class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                type="button"
                onClick={handleReset}
              >
                Reset All
              </button>
            </div>
          </form>
        ) : (
          <div class="loading">Loading airports data...</div>
        )}
      </>
    ),
    props.el
  );
}

// offline mode
export async function solForm(ydoc) {
  const [cities, setCities] = createSignal([]);
  const [isInitialized, setIsInitialized] = createSignal(false);

  const [resetTrigger, setResetTrigger] = createSignal(false);
  const selections = new Map();
  const el = document.getElementById("form");
  const airportsMap = ydoc.getMap("airports");
  setCities([...airportsMap.values()][0]);
  setIsInitialized(true);

  return FormComponent({
    isInitialized,
    resetTrigger,
    setResetTrigger,
    ydoc,
    cities,
    setCities,
    selections,
    el,
  });
}
