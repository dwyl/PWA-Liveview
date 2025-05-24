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
        id="pwa_action-0"
        update_available={@update_available}
        active_path={@active_path}
      />
      <br />
      <Users.display user_id={@user_id} module_id="users-elec" />

      <Menu.display active_path={@active_path} />
      <br />
      <h2 class="mt-4 mb-4 text-xl text-gray-600">
        The counter is synchronised server-side by <code>Phoenix_sync</code>
        with <code>Postgres</code>
        and <code>Yjs</code>
        client-side.
      </h2>
      <p>
        The component is rendered by <code>LiveView</code>
        using the <code>LiveSocket</code>
        when online
      </p>
      <p>When offline, we use a <code>SolidJS</code> component and push the sync via a Channel.</p>
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
  # and uses the liveSocket to updte localStorage for offline persistence
  @impl true
  def handle_event("dec", _, socket) do
    # !! buiness logic to put a circular counter is delegated to the PhxSynCount module
    {:ok, new_val} = PhxSyncCount.decrement(1)
    Logger.info("decrement val to----------->: #{new_val}")

    # update YDoc
    {:reply, %{new_val: new_val}, push_event(socket, "update-local-store", %{counter: new_val})}
    # {:noreply, socket}

    # {:noreply, socket}
  end

  def handle_event("client-clicks", %{"clicks" => 0}, socket) do
    %{counter: val} = PhxSyncCount.current()

    Logger.info("Zero client-clicks----------->: received #{0}, val: #{inspect(val)}")

    {:reply, %{new_val: val}, socket}
  end

  # the event "client-clicks" is handled by the channel
  def handle_event("client-clicks", %{"clicks" => clicks}, socket) do
    {:ok, new_val} = PhxSyncCount.decrement(clicks)

    Logger.info(
      "client-clicks----------->: received #{inspect(clicks)}, updated val: #{inspect(new_val)}"
    )

    {:reply, %{new_val: new_val}, socket}
  end
end
