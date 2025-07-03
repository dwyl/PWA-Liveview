defmodule LiveviewPwaWeb.StockPhxSyncLive do
  use LiveviewPwaWeb, :live_view

  import LiveviewPwaWeb.CoreComponents
  import Phoenix.Sync.LiveView

  alias LiveviewPwa.PhxSyncCount
  alias LiveviewPwaWeb.{Menu, PwaLiveComp, Users}

  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component
        :if={@env === :prod}
        module={PwaLiveComp}
        id="pwa_action-phx-sync"
        update_available={@update_available}
      />
      <br />
      <Users.display user_id={@user_id} module_id="users-elec" />

      <Menu.display active_path={@active_path} />
      <br />
      <h2 class="mt-4 mb-4 text-xl text-gray-800">
        The counter is synchronised server-side by <code>Phoenix_sync</code>
        with <code>Postgres</code>
        and persisted client-side with <code>Yjs</code>.
      </h2>
      <p class="mt-4 mb-4 text-xl text-gray-800">
        When online, the component below is rendered by <code>LiveView</code>.
      </p>
      <p class="mt-4 mb-4 text-xl text-gray-600">
        When offline, the component is a <code>SolidJS</code> rendered component.
      </p>
      <br />
      <div
        id="phx-sync-count"
        phx-update="stream"
        class={[unless(@show_stream, do: "opacity-0"), "max-w-[450px]"]}
      >
        <div :for={{id, item} <- @streams.phx_sync_counter} id={id} class="mt-2 flex flex-col">
          <form phx-submit="dec" id="lv-pg-form" class="w-full">
            <.button class="btn btn-custom w-full" id="dec-btn">Decrement Stock</.button>
          </form>
          <label for="range-input" class="text-sm text-gray-600 mt-4 mb-2">
            <code>Phoenix.Sync</code>
            PostgreSQL Stock: <span class="text-orange-600 ml-8">{item.counter}</span>
          </label>

          <input
            id="range-input"
            type="range"
            min="0"
            max={@max}
            name="dec-phx-sync-counter"
            value={item.counter}
            disabled
            aria-label="displayed-stock"
            class="w-full"
          />
          <div class="grid grid-cols-21 w-full">
            <span
              :for={i <- 0..20}
              class={[
                if(i === item.counter, do: "text-orange-600", else: "text-gray-400 text-xs"),
                "font-mono text-center w-5"
              ]}
            >
              {i}
            </span>
          </div>
        </div>
      </div>
      <p
        id="hook-pg"
        phx-hook="PgStockHook"
        data-max={@max}
        data-userid={@user_id}
        class="max-w-[450px]"
      >
      </p>
      <br />
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    query = PhxSyncCount.query_current()
    counter = PhxSyncCount.current() |> Map.get(:counter)

    {:ok,
     socket
     |> assign(:page_title, "PhxSync")
     |> assign(:show_stream, false)
     |> sync_stream(:phx_sync_counter, query)

     #  update local Yjs on mount
     |> push_event("update-local-store", %{counter: counter})}
  end

  @impl true
  def handle_info({:sync, {_name, :live}}, socket) do
    {:noreply, assign(socket, :show_stream, true)}
  end

  def handle_info({:sync, event}, socket) do
    {:noreply, sync_stream_update(socket, event)}
  end

  # LV rendering of online clicks
  # and uses the liveSocket to updte YDoc
  @impl true
  def handle_event("dec", _, socket) do
    # logic to put a circular counter is delegated to the PhxSynCount module
    {:ok, new_val} = PhxSyncCount.decrement(1)
    Logger.debug("decrement val to----------->: #{new_val}")
    {:reply, %{new_val: new_val}, push_event(socket, "update-local-store", %{counter: new_val})}
  end

  # event "client-clicks" sent over the userSocket
end
