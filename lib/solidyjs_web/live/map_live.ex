defmodule SolidyjsWeb.MapLive do
  use SolidyjsWeb, :live_view

  def render(assigns) do
    ~H"""
    <div id="map" phx-hook="MapHook" phx-update="ignore" style="height: 300px"></div>
    """
  end

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def handle_params(_unsigned_params, _uri, socket) do
    {:noreply, socket}
  end
end
