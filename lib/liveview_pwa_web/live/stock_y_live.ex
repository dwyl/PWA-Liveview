defmodule LiveviewPwaWeb.StockYLive do
  use LiveviewPwaWeb, :live_view
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.{Menu, Pwa, Presence}
  # import LiveviewPwaWeb.CoreComponents, only: [button: 1]
  require Logger

  @moduledoc """
  LiveView for the stock_y page.
  """

  @presence "presence"

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <button
        :if={@update_available}
        type="button"
        class="flex flex-row px-4 mb-4 mt-4 py-2 border-2 rounded-md text-midnightblue  bg-blue-200  hover:bg-bisque transition-colors duration-300"
        id="refresh-button"
        phx-click="skip-waiting"
      >
        <Pwa.svg height={20} class="mr-2" />
        <span class="ml-1 font-bold">Refesh needed</span>
      </button>
      <br />
      <p class="text-sm text-gray-600 mt-4 mb-4">User ID: {@user_id}</p>
      <p class="text-sm text-gray-600 mt-4 mb-4">Online users: {inspect(@presence_list)}</p>
      <br />
      <Menu.display update_available={@update_available} />

      <br />
      <div
        id="stock_y"
        phx-hook="StockYHook"
        phx-update="ignore"
        data-userid={@user_id}
        data-max={@max}
      >
      </div>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "ystock")
      :ok = PubSub.subscribe(:pubsub, @presence)
      # <- presence tracking
      Presence.track(self(), @presence, socket.assigns.user_id, %{})

      {:ok, assign(socket, %{presence_list: Presence.list(@presence)})}
    else
      {:ok,
       assign(socket,
         page_title: "Stock"
       )}
    end
  end

  @impl true
  def handle_params(_params, _url, socket) do
    # uri = URI.new!(url)
    {:noreply, socket}
  end

  # Presence tracking ----------------->
  @impl true
  def handle_info(%{event: "presence_diff"}, socket) do
    new_list = Presence.list(@presence) |> Map.keys()
    {:noreply, assign(socket, presence_list: new_list)}
  end

  # PWA event handlers ----------------->
  @impl true
  def handle_event("sw-lv-error", %{"error" => error}, socket) do
    Logger.warning("PWA on error")
    {:noreply, put_flash(socket, :error, inspect(error))}
  end

  def handle_event("sw-lv-ready", %{"ready" => true}, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end

  def handle_event("sw-lv-update", %{"update" => true}, socket) do
    {:noreply, assign(socket, update_available: true)}
  end

  def handle_event("skip-waiting", _params, socket) do
    {:noreply, push_event(socket, "sw-lv-skip-waiting", %{})}
  end
end
