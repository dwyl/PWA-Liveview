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
      if (props.inputType === key && props.userID != airport.userID) {
        console.log("component subscribe selection");
        setIsExternalUpdate(true);
        setInputValue(airport.city);
        setSuggestions([]);
        setIsOpen(false);
      }
    }
  });

  const filterCities = (query) => {
    if (!isExternalUpdate()) {
      return props.cities
        .filter(({ city }) => city.toLowerCase().includes(query.toLowerCase()))
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
    }
    setIsExternalUpdate(false);
  });

  const handleSelect = (city) => {
    setInputValue(city.city);
    setIsOpen(false);
    setSuggestions([]);
    state.selection.set(props.inputType, {
      ...snapshot(city),
      userID: props.userID,
      inputType: props.inputType,
    });
  };

  const handleInputChange = ({ target }) => {
    setIsExternalUpdate(false);
    setInputValue(target.value);
  };

  createEffect(() => {
    // setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
  });

  return (
    <div>
      <input
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder={`Search for ${props.label || "a city"}...`}
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search for a city"
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
                {city.city}, {city.country}
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
