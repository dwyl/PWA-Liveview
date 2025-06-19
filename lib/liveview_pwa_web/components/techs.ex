defmodule LiveviewPwaWeb.Tech do
  @moduledoc false

  use Phoenix.Component

  @doc """
  Renders a list of technology icons with their names.
  """

  attr :name, :string, required: true, doc: "Name of the technology"
  attr :path, :string, required: true, doc: "Path to the technology"

  def render(assigns) do
    ~H"""
    <div class="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-50 transition-colors">
      <img loading="lazy" class="w-8 h-8 object-contain" alt={@name} src={ViteHelper.path(@path)} />
      <span class="text-xs text-zinc-600 font-medium">{@name}</span>
    </div>
    """
  end
end

defmodule LiveviewPwaWeb.Techs do
  @moduledoc false
  use Phoenix.Component
  use LiveviewPwaWeb, :verified_routes
  alias LiveviewPwaWeb.Tech
  alias Phoenix.LiveView.JS

  def paths do
    [
      {"Phoenix", "images/logo.svg"},
      {"Elixir", "images/Elixir.svg"},
      {"SQLite", "images/sqlite.svg"},
      {"PostgreSQL", "images/PostgreSQL.svg"},
      {"Yjs", "images/yjs.webp"},
      {"SolidJS", "images/solidjs.svg"},
      {"Zig", "images/zig.svg"},
      {"WASM", "images/webassembly.svg"},
      {"Vite", "images/vitejs.svg"},
      {"Leaflet", "images/leafletjs.svg"},
      {"MapTiler", "images/maptiler.webp"},
      {"PWA", "images/pwa.svg"}
    ]
  end

  def display(assigns) do
    ~H"""
    <div
      id="tech-menu"
      class="absolute top-full left-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg p-4 hidden z-50 min-w-max"
      phx-click-away={
        JS.hide(to: "#tech-menu") |> JS.remove_class("menu-open", to: "#hamburger-menu")
      }
    >
      <div class="grid grid-cols-4 gap-4">
        <%= for tech <- paths() do %>
          <Tech.render name={elem(tech, 0)} path={elem(tech, 1)} />
        <% end %>
      </div>
    </div>
    """
  end
end
