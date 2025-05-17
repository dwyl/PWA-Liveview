defmodule LiveviewPwaWeb.StockElectricLive do
  use LiveviewPwaWeb, :live_view
  alias Phoenix.PubSub

  alias LiveviewPwaWeb.{Menu, Presence, PwaActionComponent, Users}
  alias LiveviewPwa.ElecCount

  # only: [sync_stream: 4, sync_stream_update: 3]
  import Phoenix.Sync.LiveView
  # import Ecto.Query, only: [from: 2]
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component
        module={PwaActionComponent}
        id="pwa_action-0"
        update_available={@update_available}
      />
      <Users.display user_id={@user_id} presence_list={@presence_list} />
      <Menu.display update_available={@update_available} />
      <h1>Electric Stock</h1>
      <p>Welcome to the Electric Stock page!</p>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    # :ok = PubSub.subscribe(:pubsub, "presence")
    # <- presence tracking
    # Presence.track(self(), "presence", socket.assigns.user_id, %{})

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "ystock")
      # <- presence tracking
      Presence.track(self(), "presence", socket.assigns.user_id, %{})
      init_presence_list = Presence.list("presence") |> Map.keys() |> dbg()

      query = ElecCount.counter_query()

      {:ok,
       socket
       |> assign(%{presence_list: init_presence_list, page_title: "Electric"})
       |> sync_stream(:elec_counter, query)}
    else
      {:ok, socket}
    end
  end

  @impl true
  def handle_params(_params, _url, socket) do
    {:noreply, socket}
  end

  @impl true
  def handle_info({:sync, event}, socket) do
    dbg(event)
    {:noreply, Phoenix.Sync.LiveView.sync_stream_update(socket, event)}
  end

  def handle_info(
        %{event: "presence_diff", payload: %{joins: joins, leaves: leaves}},
        socket
      ) do
    %{assigns: %{presence_list: presence_list}, id: id} = socket

    new_list =
      LiveviewPwaWeb.Presence.sieve(presence_list, joins, leaves, id)

    {:noreply, assign(socket, presence_list: new_list)}
  end

  def handle_info(:sw_ready, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end
end
