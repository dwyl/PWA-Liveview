defmodule SolidyjsWeb.StockLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
  alias Solidyjs.StockDb
  alias SolidyjsWeb.Menu
  require Logger

  @max 20

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <div id="pwaHook" phx-hook="PwaHook">
        <button
          :if={@update_available}
          class="px-4 mb-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
          id="refresh-btn"
          phx-click="accept-refresh"
        >
          Refresh needed
        </button>
      </div>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
      <Menu.display />
      <h1 class="mt-4 mb-4 text-2xl text-gray-600">Phoenix LiveView</h1>
      <p class="text-sm text-gray-600 mt-4 mb-2">Current database stock: {@current_stock}</p>
      <hr />
      <br />
      <div id="stock" phx-hook="YHook" phx-update="ignore" data-userid={@user_id}></div>
    </div>
    """
  end

  @impl true
  def mount(_params, session, socket) do
    user_id = session["user_id"] || "anonymous-#{:rand.uniform(1000)}"

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "stock")
      # Get current DB state for initial sync
      {db_value, db_state} = StockDb.get_stock()

      Logger.info("Client connected: user_id=#{user_id}, current_stock=#{db_value}")

      {:ok,
       socket
       |> assign(:update_available, false)
       |> assign(:user_id, user_id)
       |> assign(:current_stock, db_value)
       |> push_event("init_stock", %{
         # Renamed to clarify it's from DB
         db_value: db_value,
         # Renamed to clarify it's from DB
         db_state: Base.encode64(db_state),
         max: @max
       })}
    else
      {value, _} = StockDb.get_stock()

      {:ok,
       socket
       |> assign(:update_available, false)
       |> assign(:user_id, user_id)
       |> assign(:current_stock, value)}
    end
  end

  @impl true
  def handle_info({:y_update, value, b64_state}, socket) do
    Logger.info("Broadcasting y_update: value=#{value}")

    {:noreply,
     socket
     |> assign(:current_stock, value)
     |> push_event("sync_stock", %{
       value: value,
       state: b64_state
     })}
  end

  @impl true
  def handle_event("sync_state", %{"value" => value, "state" => b64_state}, socket) do
    user_id = socket.assigns.user_id
    Logger.info("Received sync_state with value: #{value} from user: #{user_id}")

    case Base.decode64(b64_state) do
      {:ok, state_bin} ->
        StockDb.update_stock(value, state_bin) |> dbg()
        :ok = Phoenix.PubSub.broadcast(:pubsub, "stock", {:y_update, value, b64_state})

        {:noreply, assign(socket, :current_stock, value)}

      :error ->
        Logger.error("Failed to decode base64 Yjs state from client")
        {:noreply, socket}
    end

    # state_bin = :erlang.list_to_binary(encoded_state)
    # StockDb.update_stock(value, state_bin)

    # Broadcast to all clients for CRDT sync
    # :ok = Phoenix.PubSub.broadcast(:pubsub, "stock", {:y_update, value, Base.encode64(state_bin)})

    # {:noreply, assign(socket, :current_stock, value)}
  end

  @doc """
  When a client reconnects, they send their local state.
  We need to reconcile it with the server state to ensure CRDT consistency.
  """
  def handle_event("reconnect_sync", %{"value" => client_value, "state" => client_state}, socket) do
    user_id = socket.assigns.user_id
    Logger.info("Client #{user_id} reconnected with value: #{client_value}")

    # Use StockDb's reconciliation logic
    case Base.decode64(client_state) do
      {:ok, state_bin} ->
        case StockDb.handle_client_reconnection(client_value, state_bin) do
          {:client_wins, value, state} ->
            # respond with encoded again
            {:noreply,
             push_event(socket, "sync_stock", %{value: value, state: Base.encode64(state)})}

          {:server_wins, value, state} ->
            {:noreply,
             push_event(socket, "sync_stock", %{value: value, state: Base.encode64(state)})}
        end

      :error ->
        Logger.error("Failed to decode base64 Yjs state on reconnect")
        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("request_latest_state", _params, socket) do
    user_id = socket.assigns.user_id
    Logger.info("Received request_latest_state from user: #{user_id}")

    # Just get the DB value for initial sync
    # Client will keep their own value if it's higher
    {value, state} = StockDb.get_stock()
    Logger.info("Sending latest state: value=#{value}")

    {:noreply,
     socket
     |> push_event("sync_stock", %{
       value: value,
       state: state
     })}
  end

  # PWA event handlers
  def handle_event("pwa-offline-ready", %{"msg" => msg}, socket) do
    Logger.info("PWA offline ready: #{msg}")
    {:noreply, put_flash(socket, :info, msg)}
  end

  def handle_event("pwa-update-available", %{"updateAvailable" => true}, socket) do
    {:noreply, assign(socket, :update_available, true)}
  end

  def handle_event("pwa-registration-error", %{"error" => error}, socket) do
    {:noreply, put_flash(socket, :error, error)}
  end

  def handle_event("accept-refresh", _, socket) do
    {:noreply, push_navigate(socket, to: "/", replace: true)}
  end
end
