defmodule LiveviewPwaWeb.Menu do
  use Phoenix.Component
  import LiveviewPwaWeb.CoreComponents, only: [icon: 1]
  use LiveviewPwaWeb, :verified_routes

  @moduledoc """
  A menu component that displays navigation links for the application.
  """

  # class="flex flex-col items-center"

  def display(assigns) do
    ~H"""
    <div id="menu">
      <%!-- <div class="flex justify-between items-center" > --%>
      <nav
        id="navbar"
        phx-hook="PwaHook"
        class="mt-4 bg-gradient-to-r from-blue-200 to-purple-200 p-4 rounded-lg shadow-md flex justify-between items-center"
      >
        <%!-- <div class="flex justify-between items-center"> --%>

        <.link
          id="countdown"
          data-path="/"
          patch={~p"/"}
          replace
          class="px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
        >
          <%!-- <span> --%>
          <.icon name="hero-home-solid" /> &nbsp Stock_Y &nbsp <.icon name="hero-chart-bar" />
          <%!-- </span> --%>
        </.link>

        <.link
          id="mapform"
          data-path="/map"
          patch={~p"/map"}
          replace
          class="px-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
        >
          <%!-- <span> --%>
          <.icon name="hero-cpu-chip" /> &nbsp Leaflet &nbsp <.icon name="hero-globe-alt" />
          <%!-- </span> --%>
        </.link>
        <%!-- </div> --%>
      </nav>
      <%!-- </div> --%>
    </div>
    """
  end
end
