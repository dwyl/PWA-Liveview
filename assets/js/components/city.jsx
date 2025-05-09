import { For, Show, createSignal, createEffect, onCleanup } from "solid-js";

import { snapshot, subscribe } from "valtio/vanilla";
import { state } from "@js/stores/vStore";

export default function City(props) {
  // Create signals for input value, suggestions, dropdown visibility, and selection status
  const [inputValue, setInputValue] = createSignal("");
  const [suggestions, setSuggestions] = createSignal([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const [hasSelection, setHasSelection] = createSignal(false); // New signal for tracking selection

  // Initialize input from store on mount
  // onMount(() => {
  //   console.log("mounted City");
  //   // Check if there's an existing value in the store for the input type
  //   if (state.selection.has(props.inputType)) {
  //     const airport = snapshot(state.selection.get(props.inputType));
  //     if (airport && (airport.displayText || airport.name)) {
  //       setInputValue(airport.displayText || airport.name);
  //     }
  //   }
  // });

  // Create a subscription to the selection store to update the input value
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
    const airportName = city.name || "Unknown Airport";
    const cityName = city.city || "";
    const countryName = city.country || "";
    const latitude = city.latitude;
    const longitude = city.longitude;

    const location = [cityName, countryName].filter(Boolean).join(", ");

    const displayText = [airportName, location].filter(Boolean).join(" ");

    // Create marker data
    const markerData = {
      lat: latitude,
      lng: longitude,
      name: airportName,
      altitude: city.altitude,
      userID: props.userID,
      inputType: props.inputType,
    };

    // Update input value directly and close the dropdown
    setInputValue(displayText);

    setIsOpen(false);
    setSuggestions([]);

    // Update global state with the selected marker data
    // console.log(`Updating state.selection for ${props.inputType}:`, markerData);
    state.selection.set(props.inputType, markerData);
  };

  // Handle input change and clear selection if input is empty
  const handleInputChange = (event) => {
    const newValue = event.target.value;
    // console.log(`Input changed for ${props.inputType}:`, newValue);
    setInputValue(newValue);

    // Clear selection from store if input is emptied
    if (!newValue && state.selection.has(props.inputType)) {
      state.selection.delete(props.inputType);
    }
  };

  onCleanup(() => {
    unsubscribe();
    // console.log("cleanup City");
  });

  return (
    <div class="relative mb-4 mt-4">
      <input
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder={`Search for ${props.label || "an airport"}...`}
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        role="combobox"
        aria-label={`Search for ${props.label || "an airport"}`}
        aria-controls="airport-listbox"
        aria-expanded={isOpen()}
        aria-autocomplete="list"
        autocomplete="off"
      />
      <Show when={isOpen() && suggestions().length > 0}>
        <ul
          id="airport-listbox"
          role="listbox"
          class="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          <For each={suggestions()}>
            {(city) => (
              <li
                onClick={() => handleSelect(city)}
                role="option"
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {city.name || "Unknown Airport"}
                {(city.city || city.country) && " ("}
                {city.city}
                {city.city && city.country && ", "}
                {city.country}
                {(city.city || city.country) && ")"}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
