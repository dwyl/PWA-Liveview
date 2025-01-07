//
import { For, Show, createSignal, createEffect } from "solid-js";

export function FormCities(props) {
  const [inputValue, setInputValue] = createSignal("");
  const [suggestions, setSuggestions] = createSignal([]);
  const [isOpen, setIsOpen] = createSignal(false);
  const filterCities = (query) => {
    const cityNames = Object.keys(props.cities);
    return cityNames
      .filter((city) => city.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5); // Limit to 5 suggestions
  };

  createEffect(() => {
    if (inputValue().length >= 2) {
      setSuggestions(filterCities(inputValue()));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  });

  const handleSelect = (city) => {
    setInputValue(city);
    setIsOpen(false);
    props.onSelect?.(city, props.cities[city]);
  };

  const handleInputChange = ({ target }) => {
    setInputValue(target.value);
  };

  return (
    <div class="form-cities">
      <input
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder="Search for a city..."
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Show when={isOpen() && suggestions().length > 0}>
        <ul class="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          <For each={suggestions()}>
            {(city) => (
              <li
                onClick={() => handleSelect(city)}
                class="px-4 py-2 cursor-pointer hover:bg-gray-100"
              >
                {city}
              </li>
            )}
          </For>
        </ul>
      </Show>

      {/* <Show when={props.progress > 0}>
        <div class="progress">Download progress: {props.progress}%</div>
      </Show> */}

      {/* <button onClick={props.onDownload}>Download Data</button> */}
    </div>
  );
}
