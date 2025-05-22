defmodule LiveviewPwaWeb.StockPhxSyncLive do
  use LiveviewPwaWeb, :live_view

  alias LiveviewPwaWeb.{PwaLiveC, Users, Menu}
  alias LiveviewPwa.PhxSyncCount
  # alias LiveviewPwaWeb.Presence

  import LiveviewPwaWeb.CoreComponents

  import Phoenix.Sync.LiveView
  # import Ecto.Query, only: [from: 2]
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component
        module={PwaLiveC}
        id="pwa_action-0"
        update_available={@update_available}
        active_path={@active_path}
      />
      <br />
      <Users.display user_id={@user_id} module_id="users-elec" />

      <Menu.display update_available={@update_available} active_path={@active_path} />
      <br />
      <h2 class="mt-4 mb-4 text-xl text-gray-600">The counter is synchronised by <code>Phoenix_sync</code> with <code>Postgres</code></h2>
      <p :if={@streams.phx_sync_counter} id="phx-sync-count" phx-update="stream">
        <div :for={{_id, item} <- @streams.phx_sync_counter}>
          <form phx-submit="dec" phx-hook="PgStockHook" id="phx-sync-count-form">
            <.button>Decrement</.button>
            <input
              type="range"
              min="0"
              max={@max}
              name="dec-phx-sync-counter"
              value={item.counter}
              aria-label="displayed-stock"
            />
            <span class="ml-8">{item.counter}</span>
          </form>
        </div>
      </p>
      <br />
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    query = PhxSyncCount.query_current()

    {:ok,
     socket
     |> assign(:socket_id, socket.id)
     |> assign(:page_title, "Electric")
     |> sync_stream(:phx_sync_counter, query)}
  end

  @impl true
  def handle_info({:sync, {_name, :live}}, socket) do
    {:noreply, assign(socket, :show_stream, true)}
  end

  # pass through
  def handle_info({:sync, event}, socket) do
    {:noreply, sync_stream_update(socket, event)}
  end

  @impl true
  def handle_event("dec", _params, socket) do
    {:ok, new_val} = PhxSyncCount.decrement()
    {:noreply, push_event(socket, "pg-update", %{count: new_val})}
  end
end
