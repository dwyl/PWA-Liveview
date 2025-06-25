import { createEffect, createSignal, lazy, batch, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { subscribeKey } from "valtio/vanilla/utils";
import { state } from "@js/stores/vStore";
import flyUrl from "@assets/fly.svg?url";
import delUrl from "@assets/delete.svg?url";

export const CitiesForm = ({ el, userID, _this }) => {
  const dispose = render(() => {
    const [isInitialized, setIsInitialized] = createSignal(false);
    const [cities, setCities] = createSignal([]);

    const City = lazy(() => import("@jsx/components/city"));
    const Icon = lazy(() => import("@jsx/components/icon"));

    // Subscribe to changes in the airports state on first hook mount
    //  !!! state.airports get reassigned in the hookForm.js so we need to
    //  subscribe to the state and not the airports array
    // or use subscribeKey to listen to the airports array
    const unsubscribe = subscribeKey(state, "airports", setCitiesFromState);

    // this will run if Valtio detects a change in the airports state
    function setCitiesFromState() {
      const { airports } = state;
      if (airports.length > 0) {
        batch(() => {
          setCities(airports);
          setIsInitialized(true);
        });
      }
    }

    // this will always run and eventually set the cities
    // if not already done on the subscription
    createEffect(() => {
      if (state.airports.length > 0 && cities().length === 0) {
        batch(() => {
          setCities(state.airports);
          setIsInitialized(true);
        });
      }
    });

    onCleanup(() => {
      unsubscribe();
      console.log("[CitiesForm] Valtio unsubscribe");
    });

    // update the stores
    function handleReset() {
      state.selection.delete("departure");
      state.selection.delete("arrival");
      state.flight = {};
      state.deletionState.isDeleted = true;
      state.deletionState.timestamp = Date.now();
      state.deletionState.deletedBy = userID;
      _this?.pushEvent("delete", {
        userID,
        ...state.flight,
      });
    }

    // form is submitted with two inputs
    function handleSubmit(e) {
      e.preventDefault();
      if (state.selection.size !== 2) return;

      state.flight.departure = state.selection.get("departure");
      state.flight.arrival = state.selection.get("arrival");

      if (window.liveSocket?.isConnected() && _this) {
        _this?.pushEvent("fly", { userID: userID, ...state.flight });
      }
    }

    // const dispose = render(
    // () => (
    return (
      <>
        {isInitialized() ? (
          <form onSubmit={handleSubmit} class="relative">
            <div class="relative z-20">
              <City
                cities={cities()}
                inputType="departure"
                label="Departure City"
                userID={userID}
              />
            </div>
            <div class="relative z-10">
              <City
                cities={cities()}
                inputType="arrival"
                label="Arrival City"
                userID={userID}
              />
            </div>
            <div class="flex gap-4 mt-4 justify-center">
              <button
                class="w-48 px-4 py-2 bg-bisque text-midnightblue rounded-lg items-center shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue flex flex-col  justify-center gap-1"
                type="submit"
              >
                <Icon url={flyUrl} />
                <span class="text-sm">Fly !</span>
              </button>
              <button
                class="w-48 px-4 py-2 bg-bisque text-midnightblue rounded-lg items-center shadow-md hover:bg-midnightblue hover:text-bisque focus:outline-none active:bg-bisque active:text-midnightblue flex flex-col justify-center gap-1"
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
    );
  }, el);

  return () => {
    dispose();
    console.log("[CitiesForm] unmounted");
  };
};
