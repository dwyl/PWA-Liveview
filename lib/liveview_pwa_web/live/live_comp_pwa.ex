defmodule LiveviewPwaWeb.PwaLiveComp do
  use LiveviewPwaWeb, :live_component
  alias LiveviewPwaWeb.{Pwa}
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div id="pwa_action-1">
      <button
        :if={@update_available}
        type="button"
        class="flex flex-row px-4 mb-4 mt-4 py-2 border-2 rounded-md text-midnightblue  bg-blue-200  hover:bg-bisque transition-colors duration-300"
        id="refresh-button"
        phx-click="skip-waiting"
        phx-target={@myself}
        phx-hook="PwaHook"
      >
        <Pwa.svg height={20} class="mr-2" />
        <span class="ml-1 font-bold">Refresh needed</span>
      </button>
    </div>
    """
  end

  @impl true
  def handle_event("sw-lv-update", %{"update" => true}, socket) do
    {:noreply, assign(socket, :update_available, true)}
  end

  def handle_event("skip-waiting", _params, socket) do
    {:noreply, push_event(socket, "sw-lv-skip-waiting", %{})}
  end
end
