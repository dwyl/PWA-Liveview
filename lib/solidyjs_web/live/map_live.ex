defmodule SolidyjsWeb.MapLive do
  use SolidyjsWeb, :live_view
  use Phoenix.Component
  alias SolidyjsWeb.Menu
  alias Phoenix.LiveView.AsyncResult
  alias Phoenix.PubSub
  import SolidyjsWeb.CoreComponents, only: [button: 1]

  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <Menu.display />
      <div id="map" phx-hook="MapHook" phx-update="ignore" style="height: 300px"></div>
      <div id="select_form" phx-hook="FormHook" phx-update="ignore"></div>
      <%!-- <.button phx-click="download-evt" phx-value-file="new.csv">Download airports</.button> --%>
      <%!-- <.async_result :let={stream_key} assign={@airports}>
        <:loading>Loading airports...</:loading>
        <:failed :let={_failure}>
          There was an error loading the airports. Please try again later.
        </:failed>
        <ul id="airports_stream" phx-update="stream">
          <li :for={{id, municipality, lat, long} <- @streams[stream_key]} id={id}>
            {municipality}, {lat}, {long}
          </li>
        </ul>
      </.async_result> --%>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "download_progress")
    end

    {:ok, socket}
  end

  @impl true
  def handle_params(_, uri, socket) do
    case URI.parse(uri).path do
      "/map" ->
        IO.inspect(uri)

        {:noreply,
         socket
         |> assign(:airports, AsyncResult.loading())
         |> start_async(
           :fetch_airports,
           &SqliteHandler.municipalities/0
         )}

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_async(:fetch_airports, {:ok, fetched_airports}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.ok(airports, fetched_airports))
     |> push_event("airports", %{airports: fetched_airports})
     |> assign(:airports, %{})}
  end

  @impl true
  def handle_async(:airports, {:exit, reason}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.failed(airports, {:exit, reason}))}
  end

  @impl true
  def handle_info({:downloading, %{progress: p}}, socket) do
    {:noreply, push_event(socket, "push_download", %{progress: p})}
  end

  def handle_info(msg, socket) do
    Logger.warning("unhandled: #{msg}")
    {:noreply, socket}
  end

  @impl true
  def handle_event("download-evt", %{"file" => _file}, socket) do
    socket.assigns |> dbg()
    # Airports.download()

    # Airports.parse_csv_file()
    # |> Airports.insert_airports_into_db()

    {:noreply, socket}
  end

  def handle_event(msg, pay, socket) do
    IO.inspect(msg, label: "unhandled event")
    IO.inspect(pay, label: "unhandled event")
    {:noreply, socket}
  end
end
