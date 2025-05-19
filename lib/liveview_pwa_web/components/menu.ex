defmodule LiveviewPwaWeb.Menu do
  use Phoenix.Component
  import LiveviewPwaWeb.CoreComponents, only: [icon: 1]
  use LiveviewPwaWeb, :verified_routes

  @moduledoc """
  A menu component that displays navigation links for the application.
  """

  # class="flex flex-col items-center"

  defp menu do
    [
      %{id: "countdown", title: "Yjs", path: "/", icon: "hero-home-solid"},
      %{id: "elec", title: "Electric", path: "/elec", icon: "hero-bolt"},
      %{id: "mapform", title: "Map", path: "/map", icon: "hero-globe-alt"}
    ]
  end

  # class="px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"

  defp link_class do
    "px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
  end

  attr :active_path, :string, default: "/"
  attr :update_available, :boolean, default: false

  def display(assigns) do
    ~H"""
    <div id="menu">
      <nav
        id="navbar"
        phx-hook="PwaHook"
        class="mt-4 bg-gradient-to-r from-blue-200 to-purple-200 p-4 rounded-lg shadow-md flex justify-between items-center"
      >
        <.link
          :for={item <- menu()}
          id={item.id}
          data-path={item.path}
          patch={item.path}
          replace
          class={[if(@active_path == item.path, do: "border-midnightblue", else: nil), link_class()]}
        >
          <.icon name={item.icon} /> &nbsp {item.title} &nbsp
        </.link>
      </nav>
    </div>
    """
  end
end

# class=["px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300", "#{@active == item.path} &&  ] --%>
