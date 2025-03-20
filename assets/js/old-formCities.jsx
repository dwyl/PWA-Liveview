/* eslint-disable */
import { For, Show, createSignal, createEffect } from "solid-js";
import { subscribe } from "valtio/vanilla";
import { snapshot } from "valtio";
import state from "./vStore.js";

export default function FormCities(props) {
  const [inputValue, setInputValue] = createSignal("");
  const [suggestions, setSuggestions] = createSignal([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const [isExternalUpdate, setIsExternalUpdate] = createSignal(false);

  subscribe(state.selection, () => {
    if (
      state.selection.action == "delete_airports" ||
      state.selection.action == undefined
    ) {
      setInputValue("");
      setSuggestions([]);
      setIsOpen(false);
    } else {
      const [key, value] = [...state.selection][0];
      const airport = snapshot(value);
      if (props.inputType === key) {
        console.log("component subscribe selection");
        setIsExternalUpdate(true);
        //setInputValue(airport.airport_id);
        setInputValue(airport.displayText || airport.name);
        setSuggestions([]);
        setIsOpen(false);
      }
    }
  });

  const filterCities = (query) => {
    if (!isExternalUpdate()) {
      const lowercaseQuery = query.toLowerCase();
      return props.cities
        .filter((airport) => {
          // Filter by airport name, city, and IATA code
          // const name = airport.name || "";
          const city = airport.city || "";
          // const iata = airport.iata || "";
          return city.toLowerCase().includes(lowercaseQuery);
        })
        .slice(0, 5); // Limit to 5 suggestions
    }
    return [];
  };

  createEffect(() => {
    if (inputValue().length >= 2 && !isExternalUpdate()) {
      setSuggestions(filterCities(inputValue()));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
      if (isExternalUpdate()) {
        setIsExternalUpdate(false);
      }
    }
  });

  const handleSelect = (city) => {
    setIsExternalUpdate(true);
    // Format display text: Name (City, Country) [IATA] - Lat/Long
    const airportName = city.name || "Unknown Airport";
    const cityName = city.city || "";
    const countryName = city.country || "";
    const iataCode = city.iata || "";
    const latitude = city.latitude; // Already a float from server
    const longitude = city.longitude; // Already a float from server

    // Build location string
    const location = [cityName, countryName].filter(Boolean).join(", ");
    const coordinates = `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;

    // Format the display string
    const displayText = [
      airportName,
      location && `(${location})`,
      iataCode && `[${iataCode}]`,
      coordinates,
    ]
      .filter(Boolean)
      .join(" ");

    setInputValue(displayText);
    setIsOpen(false);
    setSuggestions([]);

    // Log the marker data being sent
    const markerData = {
      lat: latitude,
      lng: longitude,
      name: airportName,
      iata: iataCode,
      altitude: city.altitude, // Include altitude for elevation data
      userID: props.userID,
      inputType: props.inputType,
    };
    console.log("Marker data:", markerData);

    // Only send required fields for markers
    // state.selection.set(props.inputType, markerData);
    // Only send required fields for markers
    state.selection.set(props.inputType, {
      ...markerData,
      displayText: displayText, // Add the display text to the state
    });
  };

  const handleInputChange = ({ target }) => {
    setIsExternalUpdate(false);
    setInputValue(target.value);

    // Log the filtered suggestions to see field mapping
    if (target.value.length >= 2) {
      const suggestions = filterCities(target.value);
      console.log(
        "Filtered suggestions:",
        suggestions.map((city) => ({
          name: city.name,
          city: city.city,
          country: city.country,
          iata: city.iata,
          icao: city.icao,
          latitude: city.latitude,
          longitude: city.longitude,
        }))
      );
    }
  };

  /*
  createEffect(() => {
    // setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
  });
  */

  return (
    <div>
      <input
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder={`Search for ${props.label || "an airport"}...`}
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search for an airport"
        aria-autocomplete="list"
        aria-expanded={isOpen()}
      />
      <Show when={isOpen() && suggestions().length > 0}>
        <ul class="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <For each={suggestions()}>
            {(city) => (
              <li
                onClick={() => handleSelect(city)}
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {/* Display airport info: Name (City, Country) [IATA] - Lat/Long */}
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
