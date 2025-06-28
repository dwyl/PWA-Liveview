defmodule LiveviewPwaWeb.Menu do
  @moduledoc """
  A menu component that displays navigation links for the application.
  """

  use Phoenix.Component
  use LiveviewPwaWeb, :verified_routes

  import LiveviewPwaWeb.CoreComponents, only: [icon: 1]

  defp session_menu do
    [
      %{id: "sync", title: "PhxSync", path: ~p"/sync", icon: "hero-bolt"},
      %{id: "yjsch", title: "YjsChannel", path: ~p"/yjs", icon: "hero-wrench"},
      %{id: "mapform", title: "FlightMap", path: ~p"/map", icon: "hero-globe-alt"}
    ]
  end

  defp off_menu do
    [
      %{id: "off", title: "Off session", path: ~p"/off-session", icon: "hero-arrow-up-right"},
      %{id: "dashboard", title: " Dashboard", path: "/dashboard", icon: "hero-wrench-screwdriver"}
    ]
  end

  attr :active_path, :string, default: "/"

  def display(assigns) do
    ~H"""
    <nav
      id="menu"
      class="flex justify-center navbar navbar-center bg-primary text-primary-content shadow-sm"
    >
      <ul class="menu menu-lg sm:menu-horizontal bg-base-800 rounded-box">
        <li :for={item <- session_menu()}>
          <.link
            data-path={item.path}
            id={item.id}
            patch={item.path}
            href={item.id == "off" && item.path}
            target={item.id === "dashboard" && "_blank"}
            replace
            class={[
              if(@active_path == item.path, do: "menu-active", else: nil),
              "text-white font-bold"
            ]}
          >
            <.icon name={item.icon} />
            <span>{item.title}</span>
          </.link>
        </li>
        <li :for={item <- off_menu()}>
          <.link
            data-path={item.path}
            id={item.id}
            href={item.path}
            target={item.id === "dashboard" && "_blank"}
            replace
            class={[
              if(@active_path == item.path, do: "menu-active", else: nil),
              "text-white font-bold"
            ]}
          >
            <.icon name={item.icon} />
            <span>{item.title}</span>
          </.link>
        </li>
      </ul>
    </nav>
    """
  end
end
