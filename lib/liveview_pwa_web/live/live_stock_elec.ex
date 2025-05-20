defmodule LiveviewPwaWeb.StockElectricLive do
  use LiveviewPwaWeb, :live_view
  alias Phoenix.PubSub

  alias LiveviewPwaWeb.{PwaLiveC, Users, Menu, Presence}
  alias LiveviewPwa.ElecCount
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
      <p>{inspect(@socket_id)}</p>

      <Menu.display update_available={@update_available} active_path={@active_path} />
      <br />
      <h1>Electric Stock</h1>
      <h2>Welcome to the Electric Stock page!</h2>
      <p :if={@streams.elec_counter} id="elec_count" phx-update="stream">
        <div :for={{_id, item} <- @streams.elec_counter}>
          <p>{item.counter}</p>
        </div>
        <form phx-submit="dec">
          <.button>Decrement</.button>
          <%!-- <input type="range" min="0" max={@max} name="counter" value={item.counter} /> --%>
        </form>
      </p>
      <br />
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    query = ElecCount.query_current()

    if connected?(socket) do
      # :ok = PubSub.subscribe(:pubsub, "presence")
      # Presence.track(self(), "presence", socket.assigns.user_id, %{})
    end

    # presence_entries = Presence.list("presence") |> Map.values()
    # {socket.id, presence_entries} |> dbg()

    {:ok,
     socket
     |> assign(:socket_id, socket.id)
     |> assign(:page_title, "Electric")
     #  |> assign(:presence_list, presence_entries)
     |> sync_stream(:elec_counter, query)}

    #  |> attach_hook(:presence_ist, :handle_info, &sieve/2)}

    #  subscribing the LiveView socket to a real-time data stream
    # from ElectricSQL, based on the query
    #  |> sync_stream(:elec_counter, query)}
  end

  @impl true
  def handle_params(_params, url, socket) do
    path = URI.new!(url) |> Map.get(:path)
    {:noreply, assign(socket, :active_path, path)}
  end

  @impl true
  def handle_info({:sync, {_name, :live}}, socket) do
    {:noreply, assign(socket, :show_stream, true)}
  end

  # pass through
  def handle_info({:sync, event}, socket) do
    {:noreply, Phoenix.Sync.LiveView.sync_stream_update(socket, event)}
  end

  # def handle_info(%{event: "presence_diff"} = payload, socket) do
  #   %{payload: %{joins: joins, leaves: leaves}} = payload
  #   %{assigns: %{presence_list: presence_list}} = socket

  #   new_list = Presence.sieve(presence_list, joins, leaves, socket.id)
  #   # socket =
  #   #   Enum.reduce(Map.keys(joins), socket, fn user_id, s ->
  #   #     stream_insert(s, :presence_list, %{id: user_id})
  #   #   end)

  #   # socket =
  #   #   Enum.reduce(Map.keys(leaves), socket, fn user_id, s ->
  #   #     stream_delete(s, :presence_list, %{id: user_id})
  #   #   end)

  #   {:noreply, assign(socket, :presence_list, new_list)}
  # end

  @impl true
  def handle_event("dec", _params, socket) do
    LiveviewPwa.ElecCount.decrement()
    {:noreply, socket}
  end
end
