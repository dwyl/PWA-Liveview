defmodule SolidyjsWeb.MapLive do
  use SolidyjsWeb, :live_view
  use Phoenix.Component
  alias SolidyjsWeb.Menu

  def render(assigns) do
    ~H"""
    <Menu.display />
    <div id="map" phx-hook="MapHook" phx-update="ignore" style="height: 300px"></div>
    """
  end

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def handle_params(_unsigned_params, uri, socket) do
    IO.inspect(uri)

    {:noreply, socket}
  end
end
