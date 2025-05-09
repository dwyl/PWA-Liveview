import { createEffect, createSignal, lazy } from "solid-js";
import { render } from "solid-js/web";
import { subscribe } from "valtio/vanilla";
import { state } from "@js/stores/vStore";
import flyUrl from "../../images/fly.svg?url";
import delUrl from "../../images/delete.svg?url";

// function Icon(props) {
//   return (
//     <img
//       src={props.url}
//       alt="Fly Icon"
//       class="w-6 h-6 mr-2 aspect-square object-contain"
//     />
//   );
// }

let dispose = null;
export const CitiesForm = (props) => {
  // console.log("CitiesForm component mounting");
  if (dispose) dispose();

  const [isInitialized, setIsInitialized] = createSignal(false);
  const [cities, setCities] = createSignal([]);

  const City = lazy(() => import("@jsx/components/city"));
  const Icon = lazy(() => import("@jsx/components/icon"));

  // Subscribe to changes in the airports state on first hook mount
  const unsubscribe = subscribe(state.airports, setCitiesFromState);

  // this will run if Valtio detects a change in the airports state
  function setCitiesFromState() {
    const { airports } = state;
    // console.log(
    //   "subscribe runs",
    //   airports.length,
    //   cities().length,
    //   isInitialized()
    // );
    if (airports.length > 0) {
      setCities(airports);
      setIsInitialized(true);
    }
  }

  // this will always run and eventually set the cities
  // if not already done on the subscription
  createEffect(() => {
    if (state.airports.length > 0 && cities().length === 0) {
      setCities(state.airports);
      setIsInitialized(true);
    }
  });

  // update the stores
  function handleReset() {
    state.deletionState.isDeleted = true;
    state.deletionState.timestamp = Date.now();
    state.deletionState.deletedBy = props.userID;
    props._this?.pushEvent("delete", {
      userID: props.userID,
      ...state.flight,
      timestamp: state.deletionState.timestamp,
    });
  }

  // form is submitted with two inputs
  function handleSubmit(e) {
    e.preventDefault();
    if (state.selection.size !== 2) return;

    state.flight.departure = state.selection.get("departure");
    state.flight.arrival = state.selection.get("arrival");

    if (window.liveSocket?.isConnected() && props._this) {
      props._this?.pushEvent("fly", { userID: props.userID, ...state.flight });
    }
  }

  dispose = render(
    () => (
      <>
        {isInitialized() ? (
          <form onSubmit={handleSubmit} class="relative">
            <div class="relative z-20">
              <City
                cities={cities()}
                inputType="departure"
                label="Departure City"
                userID={props.userID}
              />
            </div>
            <div class="relative z-10">
              <City
                cities={cities()}
                inputType="arrival"
                label="Arrival City"
                userID={props.userID}
              />
            </div>
            <div class="flex gap-4 mt-4 justify-center">
              <button
                class="w-48 px-4 py-2 bg-bisque text-midnightblue rounded-lg shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue flex flex-col  justify-center gap-1"
                type="submit"
              >
                <Icon url={flyUrl} />
                <span class="text-sm">Fly !</span>
              </button>
              <button
                class="w-48 px-4 py-2 bg-bisque text-midnightblue rounded-lg shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue flex flex-col justify-center gap-1"
                type="button"
                onClick={handleReset}
              >
                <Icon url={delUrl} />
                <span class="text-sm">Reset</span>
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

  /**
   * Cleanup function to unsubscribe from the airports state
   * and dispose of the Solid component when the component is unmounted.
   * This is important to prevent memory leaks and ensure that
   * the component is properly cleaned up when it is no longer needed.
   */
  return () => {
    unsubscribe();
    dispose();
    // console.log("CitiesForm component unmounted");
  };
};
