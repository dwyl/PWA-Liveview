import {
  For,
  Show,
  createSignal,
  createEffect,
  onMount,
  onCleanup,
} from "solid-js";
import { subscribe } from "valtio/vanilla";
import { snapshot } from "valtio";
import state from "./vStore.js";

export default function FormCities(props) {
  // Create signals for input value, suggestions, dropdown visibility, and selection status
  const [inputValue, setInputValue] = createSignal("");
  const [suggestions, setSuggestions] = createSignal([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const [hasSelection, setHasSelection] = createSignal(false); // New signal for tracking selection

  // DOM reference for the input element
  let inputRef;

  // Initialize input from store on mount
  onMount(() => {
    console.log(`FormCities mounted for ${props.inputType}`);

    // Check if there's an existing value in the store for the input type
    if (state.selection.has(props.inputType)) {
      const airport = snapshot(state.selection.get(props.inputType));
      if (airport && (airport.displayText || airport.name)) {
        setInputValue(airport.displayText || airport.name);
        console.log(
          `Initialized ${props.inputType} from store:`,
          airport.displayText || airport.name
        );
      }
    }
  });

  // Create a strong subscription to the selection store to update the input value
  const unsubscribe = subscribe(state.selection, () => {
    if (state.selection.has(props.inputType)) {
      const airport = snapshot(state.selection.get(props.inputType));
      if (airport && (airport.displayText || airport.name)) {
        setInputValue(airport.displayText || airport.name);
        setHasSelection(true); // Selection found, update the selection status
      }
    } else if (hasSelection()) {
      // If selection is removed externally, reset the input field
      setInputValue("");
      setHasSelection(false);
    }
  });

  // Clean up the subscription on unmount
  onCleanup(() => {
    console.log(`Cleaning up FormCities for ${props.inputType}`);
    unsubscribe();
  });

  // Filter cities based on the input query
  const filterCities = (query) => {
    if (!query || query.length < 2) return [];

    const lowercaseQuery = query.toLowerCase();
    return props.cities
      .filter((airport) => {
        const city = (airport.city || "").toLowerCase();
        return city.includes(lowercaseQuery);
      })
      .slice(0, 5); // Limit to 5 suggestions
  };

  // Effect to update suggestions based on input value
  createEffect(() => {
    const value = inputValue();
    console.log("createEffect", value);

    if (value.length >= 2) {
      const filteredSuggestions = filterCities(value);
      setSuggestions(filteredSuggestions);
      setIsOpen(filteredSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  });

  // Handle city selection from the dropdown
  const handleSelect = (city) => {
    console.log(`Selected city for ${props.inputType}:`, city);

    // Format display text
    const airportName = city.name || "Unknown Airport";
    const cityName = city.city || "";
    const countryName = city.country || "";
    const iataCode = city.iata || "";
    const latitude = city.latitude;
    const longitude = city.longitude;

    const location = [cityName, countryName].filter(Boolean).join(", ");
    const coordinates = `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;

    const displayText = [
      airportName,
      location && `(${location})`,
      iataCode && `[${iataCode}]`,
      coordinates,
    ]
      .filter(Boolean)
      .join(" ");

    // Create marker data
    const markerData = {
      lat: latitude,
      lng: longitude,
      name: airportName,
      iata: iataCode,
      altitude: city.altitude,
      userID: props.userID,
      inputType: props.inputType,
      displayText: displayText,
    };

    // Update input value directly and close the dropdown
    setInputValue(displayText);
    if (inputRef) inputRef.value = displayText;

    setIsOpen(false);
    setSuggestions([]);

    // Update global state with the selected marker data
    console.log(`Updating state.selection for ${props.inputType}:`, markerData);
    state.selection.set(props.inputType, markerData);
  };

  // Handle input change and clear selection if input is empty
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    console.log(`Input changed for ${props.inputType}:`, newValue);
    setInputValue(newValue);

    // Clear selection from store if input is emptied
    if (!newValue && state.selection.has(props.inputType)) {
      console.log(
        `Clearing selection for ${props.inputType} because input is empty`
      );
      state.selection.delete(props.inputType);
    }
  };

  return (
    <div class="relative mb-4">
      <input
        ref={inputRef}
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder={`Search for ${props.label || "an airport"}...`}
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Search for ${props.label || "an airport"}`}
        aria-autocomplete="list"
        aria-expanded={isOpen()}
        autocomplete="off"
      />
      <Show when={isOpen() && suggestions().length > 0}>
        <ul class="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <For each={suggestions()}>
            {(city) => (
              <li
                onClick={() => handleSelect(city)}
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {city.name || "Unknown Airport"}
                {(city.city || city.country) && " ("}
                {city.city}
                {city.city && city.country && ", "}
                {city.country}
                {(city.city || city.country) && ")"}
                {city.iata && ` [${city.iata}]`}
                {" - "}
                {city.latitude.toFixed(3)}°, {city.longitude.toFixed(3)}°
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
