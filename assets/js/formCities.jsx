//
import { For, Show, createSignal, createEffect } from "solid-js";
import imgUrl from "/images/x-circle.svg";

export function FormCities(props) {
  console.log("render--------");
  const [inputValue, setInputValue] = createSignal("");
  const [suggestions, setSuggestions] = createSignal([]);
  const [isOpen, setIsOpen] = createSignal(false);

  const filterCities = (query) => {
    return props.cities
      .filter(({ city }) => city.toLowerCase().includes(query.toLowerCase()))
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
    setInputValue(city.city);
    setIsOpen(false);
    props.onSelect?.(city, props.inputType);
  };

  const handleInputChange = ({ target }) => {
    setInputValue(target.value);
  };

  const handleReset = () => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    props.onReset?.(props.inputType);
  };

  // Reset input value when external reset occurs
  createEffect(() => {
    if (props.isReset?.(props.inputType)) {
      setInputValue("");
      setSuggestions([]);
      setIsOpen(false);
    }
  });

  return (
    <div class="form-cities">
      <input
        type="text"
        value={inputValue()}
        onInput={handleInputChange}
        placeholder={`Search for ${props.label || "a city"}...`}
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
                {city.city}
              </li>
            )}
          </For>
        </ul>
      </Show>
      <button onClick={handleReset}>
        <img src={imgUrl} alt="remove airport" />
      </button>

      {/* <Show when={props.progress > 0}>
        <div class="progress">Download progress: {props.progress}%</div>
      </Show> */}

      {/* <button onClick={props.onDownload}>Download Data</button> */}
    </div>
  );
}
