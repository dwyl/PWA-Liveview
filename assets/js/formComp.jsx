import { createSignal, lazy } from "solid-js";
import { render } from "solid-js/web";

export const FormComponent = (props) => {
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [resetTrigger, setResetTrigger] = createSignal(false);
  const [cities, setCities] = createSignal([]);

  const selections = new Map();
  const userID = sessionStorage.getItem("userID");
  const FormCities = lazy(() => import("./formCities.jsx"));

  const airportsMap = props.ydoc.getMap("airports");
  if (airportsMap.has("locations")) {
    setCities(airportsMap.get("locations", props.airports));
    setIsInitialized(true);
  }
  // on first load, y.js detects a change
  airportsMap.observe(() => {
    setCities(airportsMap.get("locations"));
    setIsInitialized(true);
  });

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
    selections.set(inputType, selection);
    selectionMap.set(inputType, selection);
  }

  // update the stores
  function handleReset() {
    const selectionMap = props.ydoc.getMap("selection");
    selectionMap.clear();
    selections.clear();
    setResetTrigger(true);
    // Reset the trigger after a short delay
    setTimeout(() => setResetTrigger(false), 100);
  }

  // form is submitted with two inputs
  function handleSubmit(e) {
    e.preventDefault();
    const selectionMap = props.ydoc.getMap("selection");

    if (selections.size !== 2) return;

    const [departure, arrival] = [...selectionMap.values()];
    const flightMap = props.ydoc.getMap("flight");
    flightMap.set("flight", {
      departure: [departure.lat, departure.lng],
      arrival: [arrival.lat, arrival.lng],
    });

    if (window.liveSocket.isConnected() && props.s) {
      props.s.pushEvent("fly", { userID, departure, arrival });
    }
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
            <div class="flex gap-4 mt-4 justify-center">
              <button
                class="w-32 px-4 py-2 bg-bisque text-midnightblue rounded-lg shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue"
                type="submit"
              >
                <svg
                  version="1.1"
                  id="Capa_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 38.976 38.976"
                  xml:space="preserve"
                >
                  <g>
                    <path
                      style="fill:#030104;"
                      d="M38.976,0.209L35.51,0.806l-9.12,7.552l-7.228-1.276l-6.296-1.116L7.07,4.937L3.109,8.313
		l16.148,7.411l-9.66,11.755c-0.255,0.254-0.487,0.506-0.691,0.756l-6.035-2.452L0,28.654l6.453,2.957l0.271,0.271L4.686,34.12
		l0.931,0.848l1.998-2.195l0.78,0.779l2.719,5.215l2.661-2.666l-3.104-6.138c0.158-0.11,0.311-0.231,0.448-0.373l12.534-9.847
		l0.169,0.168l8.425,16.709l2.96-3.547l-1.209-6.192l-1.207-6.187l-1.593-8.157l-0.049-0.052l7.023-8.408L38.976,0.209z"
                    />
                  </g>
                </svg>
                Fly!
              </button>
              <button
                class="w-32 px-4 py-2 bg-bisque text-midnightblue rounded-lg shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue"
                type="button"
                onClick={handleReset}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  class="h-6 w-6 mr-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                Reset All
              </button>
            </div>
          </form>
        ) : (
          <p>Loading airports data...</p>
        )}
      </>
    ),
    props.el
  );
};

// offline mode
export async function solForm(ydoc) {
  return FormComponent({
    ydoc,
    el: document.getElementById("form"),
  });
}
