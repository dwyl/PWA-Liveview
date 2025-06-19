defmodule LiveviewPwaWeb.Menu do
  use Phoenix.Component
  import LiveviewPwaWeb.CoreComponents, only: [icon: 1]
  use LiveviewPwaWeb, :verified_routes

  @moduledoc """
  A menu component that displays navigation links for the application.
  """

  defp menu do
    [
      %{id: "elec", title: "PhxSync", path: ~p"/sync", icon: "hero-bolt"},
      %{id: "countdown", title: "YjsChannel", path: ~p"/yjs", icon: "hero-wrench"},
      %{id: "mapform", title: "FlightMap", path: ~p"/map", icon: "hero-globe-alt"}
    ]
  end

  defp link_class do
    "px-4 py-2 border-2 flex flex-col justify-center flex-1 items-center ounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
  end

  attr :active_path, :string, default: "/sync"

  def display(assigns) do
    ~H"""
    <div id="menu">
      <nav
        id="navbar"
        class="mt-4 bg-gradient-to-r from-blue-200 to-purple-200 p-2 rounded-lg shadow-md flex justify-between items-center"
      >
        <.link
          :for={item <- menu()}
          id={item.id}
          data-path={item.path}
          patch={item.path}
          replace
          class={[if(@active_path == item.path, do: "border-midnightblue", else: nil), link_class()]}
        >
          <.icon name={item.icon} />
          <span class="text-sm [390px]:text-base">{item.title}</span>
        </.link>
      </nav>
    </div>
    """
  end
end
