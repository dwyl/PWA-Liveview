defmodule SolidyjsWeb.CounterLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
  # import SolidyjsWeb.CoreComponents, only: [icon: 1]
  use Phoenix.Component
  alias SolidyjsWeb.Menu

  def render(assigns) do
    ~H"""
    <div>
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

  def mount(_params, session, socket) do
    %{"user_id" => user_id} = session

    if connected?(socket) do
      PubSub.subscribe(Solidyjs.PubSub, "bc_stock")
    end

    init_stock = 20
    max = 20

    {:ok,
     socket
     |> assign(%{global_stock: init_stock, user_id: user_id})
     |> push_event("user", %{user_id: user_id, global_stock: init_stock, max: max})}
  end

  # see also on_mount {Module, :default}: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#on_mount/1
  def handle_params(_, uri, socket) do
    {:noreply, assign(socket, :uri, URI.parse(uri).path)}
  end

  def handle_event("stock", %{"user_id" => userid} = map, socket) do
    case socket.assigns.user_id == String.to_integer(userid) do
      true ->
        c = Map.get(map, "c")

        :ok =
          PubSub.broadcast(
            Solidyjs.PubSub,
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

  def handle_info({:new_stock, %{c: c, from_user_id: from_user_id}}, socket) do
    if socket.assigns.user_id != String.to_integer(from_user_id) do
      {:noreply,
       socket
       |> assign(:global_stock, c)
       |> push_event("new_stock", %{c: c})}
    else
      # Ignore user's own broadcast
      {:noreply, socket}
    end
  end
end
