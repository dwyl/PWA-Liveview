defmodule SolidyjsWeb.CounterLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
  # import SolidyjsWeb.CoreComponents, only: [icon: 1]
  use Phoenix.Component
  alias SolidyjsWeb.Menu
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <div id="pwaHook" phx-hook="PwaHook">
        <button
          class="px-4 mb-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
          id="refresh-btn"
          phx-click="accept-refresh"
        >
          Refresh needed
        </button>
      </div>
      <Menu.display />
      <h1 class="mt-4 mb-4 text-2xl text-gray-600">LiveView</h1>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
      <p class="text-sm text-gray-600 mt-4 mb-2">Remaing stock: {@global_stock}</p>
      <hr />
      <br />
      <div id="solid" phx-hook="SolHook" phx-update="ignore"></div>
    </div>
    """
  end

  @impl true
  def mount(_params, session, socket) do
    %{"user_id" => user_id} = session

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "bc_stock")
    end

    global_stock = 20
    max = 20

    {:ok,
     socket
     |> assign(%{global_stock: global_stock, user_id: user_id})
     |> push_event("user", %{user_id: user_id, global_stock: global_stock, max: max})}
  end

  # see also on_mount {Module, :default}: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#on_mount/1

  @impl true
  def handle_event("yjs-stock", payload, socket) do
    IO.inspect(payload, label: "yjs-stock")
    {:noreply, assign(socket, :global_stock, Map.get(payload, "c"))}
  end

  def handle_event("stock", %{"user_id" => nil} = _map, socket) do
    {:noreply, push_navigate(socket, to: "/", replace: true)}
  end

  def handle_event("stock", %{"user_id" => userid} = map, socket) do
    case socket.assigns.user_id == String.to_integer(userid) do
      true ->
        c = Map.get(map, "c")

        :ok =
          PubSub.broadcast(
            :pubsub,
            "bc_stock",
            {:new_stock, %{c: c, from_user_id: userid}}
          )

        {:noreply, assign(socket, :global_stock, c)}

      _ ->
        {:noreply, socket}
    end
  end

  def handle_event("stock", %{}, socket) do
    {:noreply, socket}
  end

  def handle_event("offline ready", %{"msg" => msg}, socket) do
    Logger.info(msg)
    {:noreply, put_flash(socket, :info, msg)}
  end

  def handle_event("accept-refresh", _, socket) do
    {:noreply, push_event(socket, "refreshed", %{})}
  end

  @impl true
  def handle_info({:new_stock, %{c: c, from_user_id: from_user_id}}, socket) do
    Logger.info("new stock")
    # Ignore user's own broadcast
    if socket.assigns.user_id != String.to_integer(from_user_id) do
      {:noreply,
       socket
       |> assign(:global_stock, c)
       |> push_event("new_stock", %{c: c})}
    else
      {:noreply, socket}
    end
  end
end
