defmodule LiveviewPwaWeb.HeaderComponent do
  use LiveviewPwaWeb, :live_component
  alias LiveviewPwaWeb.{Pwa, Users, Menu}
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
        <span class="ml-1 font-bold">Refesh needed</span>
      </button>
      <Users.display user_id={@user_id} presence_list={@presence_list} />
      <Menu.display update_available={@update_available} active_path={@current_path} />
    </div>
    """
  end

  @impl true
  def handle_event("sw-lv-error", %{"error" => error}, socket) do
    Logger.warning("PWA on error")
    {:noreply, put_flash(socket, :error, inspect(error))}
  end

  def handle_event("sw-lv-ready", %{"ready" => true}, socket) do
    send(self(), :sw_ready)
    {:noreply, socket}
  end

  def handle_event("sw-lv-update", %{"update" => true}, socket) do
    {:noreply, assign(socket, update_available: true)}
  end

  def handle_event("skip-waiting", _params, socket) do
    {:noreply, push_event(socket, "sw-lv-skip-waiting", %{})}
  end
end
