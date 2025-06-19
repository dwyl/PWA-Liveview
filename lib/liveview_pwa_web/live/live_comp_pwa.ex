defmodule LiveviewPwaWeb.PwaLiveComp do
  use LiveviewPwaWeb, :live_component
  alias LiveviewPwaWeb.Pwa
  require Logger

  @moduledoc """
  Live component for handling PWA updates.
  This component listens for service worker updates and provides a button
  to refresh the page when an update is available.
  It uses a Phoenix hook to manage the service worker lifecycle events.
  It is used in the LiveView modules to display a button when an update is available.
  """

  @impl true
  def render(assigns) do
    ~H"""
    <div id="pwa_action-c" phx-hook="PwaHook">
      <button
        :if={@update_available}
        type="button"
        class="flex flex-row px-4 mb-4 mt-4 py-2 border-2 rounded-md text-midnightblue  bg-blue-200  hover:bg-bisque transition-colors duration-300"
        id="refresh-button"
        phx-click="skip-waiting"
        phx-target={@myself}
      >
        <Pwa.svg height={20} class="mr-2" />
        <span class="ml-1 font-bold">Refresh needed</span>
      </button>
    </div>
    """
  end

  @impl true
  def handle_event("sw-lv-update", %{"update" => true}, socket) do
    Logger.info("Demand to Update Service Worker")
    {:noreply, assign(socket, :update_available, true)}
  end

  def handle_event("skip-waiting", _params, socket) do
    Logger.info("Updating Service Worker")

    {:noreply,
     socket
     |> assign(:update_available, false)
     |> push_event("sw-lv-skip-waiting", %{})}
  end
end
