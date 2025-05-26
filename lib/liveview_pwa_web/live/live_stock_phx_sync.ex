defmodule LiveviewPwaWeb.StockPhxSyncLive do
  use LiveviewPwaWeb, :live_view

  alias LiveviewPwaWeb.{PwaLiveComp, Users, Menu}
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
        module={PwaLiveComp}
        id="pwa_action-phx-sync"
        update_available={@update_available}
      />
      <br />
      <Users.display user_id={@user_id} module_id="users-elec" />

      <Menu.display active_path={@active_path} />
      <br />
      <h2 class="mt-4 mb-4 text-xl text-gray-600">
        The counter is synchronised server-side by <code>Phoenix_sync</code>
        with <code>Postgres</code>
        and persisted client-side with <code>Yjs</code>.
      </h2>
      <p>
        When online, the component below is rendered by <code>LiveView</code>.
      </p>
      <p>When offline, the component is a <code>SolidJS</code> rendered component.</p>
      <br />
      <p :if={@streams.phx_sync_counter} id="phx-sync-count" phx-update="stream">
        <div :for={{_id, item} <- @streams.phx_sync_counter}>
          <form phx-submit="dec" id="lv-pg-form">
            <.button>Decrement Stock</.button>
            <input
              type="range"
              min="0"
              max={@max}
              name="dec-phx-sync-counter"
              value={item.counter}
              disabled={@disabled}
              aria-label="displayed-stock"
            />
            <span class="ml-8">{item.counter}</span>
          </form>
        </div>
      </p>
      <p id="hook-pg" phx-hook="PgStockHook" data-max={@max} data-userid={@user_id}></p>
      <br />
      <%!-- phx-update="ignore" --%>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    query = PhxSyncCount.query_current()

    {:ok,
     socket
     |> assign(:page_title, "Phx-Sync")
     |> assign(:hide, false)
     |> assign(:disabled, false)
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

  # LV rendering of online clicks
  # and uses the liveSocket to updte YDoc
  @impl true
  def handle_event("dec", _, socket) do
    # !! buiness logic to put a circular counter is delegated to the PhxSynCount module
    {:ok, new_val} = PhxSyncCount.decrement(1)
    Logger.debug("decrement val to----------->: #{new_val}")

    {:reply, %{new_val: new_val},
     push_event(socket, "update-local-store", %{counter: new_val}) |> assign(:disabled, true)}
  end

  # event "client-clicks" sent over the userSocket
end
