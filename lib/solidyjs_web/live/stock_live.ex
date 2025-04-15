defmodule SolidyjsWeb.StockLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
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
    user_id = session["user_id"]
    # Get current DB state for initial sync
    {db_value, db_state} = StockDb.get_stock() |> dbg()

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "stock")
      Logger.info("Client connected: user_id=#{user_id}, current_stock=#{db_value}")
    end

    {:ok,
     socket
     |> assign(:update_available, false)
     |> assign(:user_id, user_id)
     |> assign(:current_stock, db_value)
     |> push_event("init_stock", %{
       db_value: db_value,
       db_state: Base.encode64(db_state),
       max: @max
     })}
  end

  @impl true
  def handle_info({:y_update, value, sender_id, b64_broadcasted_state}, socket) do
    user_id = socket.assigns.user_id

    if sender_id != user_id do
      Logger.info(
        "#{user_id} received broadcasted y_update with value=#{value} from #{sender_id}"
      )

      {:noreply,
       socket
       |> assign(:current_stock, value)
       |> push_event("sync_from_server", %{
         value: value,
         state: b64_broadcasted_state,
         sender: "server"
       })}
    else
      Logger.info("#{user_id} Ignoring y_update from self: , #{sender_id}")
      {:noreply, socket}
    end
  end

  def handle_info(msg, socket) do
    Logger.error("Received unexpected message: #{inspect(msg)}")
    {:noreply, socket}
  end

  @impl true
  def handle_event("sync_state", payload, socket) do
    user_id = socket.assigns.user_id
    %{"value" => value, "b64_state" => b64_client_state, "sender" => sender_id} = payload
    Logger.info("#{user_id} received sync_state with value: #{value} from #{inspect(sender_id)}")

    with {:ok, state_bin} <-
           Base.decode64(b64_client_state),
         {current_value, _y_state} <-
           StockDb.update_stock(value, state_bin),
         :ok <-
           PubSub.broadcast(
             :pubsub,
             "stock",
             {:y_update, current_value, user_id, b64_client_state}
           ) do
      {:noreply, assign(socket, :current_stock, value)}
    else
      :error ->
        Logger.error("Failed to decode base64 Yjs state from client")
        {:noreply, socket}

      msg ->
        Logger.error(inspect(msg))
        {:noreply, socket}
    end
  end

  # PWA event handlers
  def handle_event("pwa-update-available", %{"updateAvailable" => true}, socket) do
    Logger.warning("PWA Update available")
    {:noreply, assign(socket, :update_available, true)}
  end

  def handle_event("pwa-offline-ready", %{"msg" => msg}, socket) do
    Logger.info("PWA offline ready: #{msg}")
    {:noreply, put_flash(socket, :info, msg)}
  end

  def handle_event("pwa-registration-error", %{"error" => error}, socket) do
    {:noreply, put_flash(socket, :error, error)}
  end

  def handle_event("accept-refresh", _, socket) do
    {:noreply, push_navigate(socket, to: "/", replace: true)}
  end
end
