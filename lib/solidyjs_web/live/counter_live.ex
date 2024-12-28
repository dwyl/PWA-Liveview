defmodule SolidyjsWeb.CounterLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub

  def render(assigns) do
    ~H"""
    <h1 class="mt-4 mb-4 text-2xl text-gray-600">LiveView Static</h1>
    <p class="text-sm text-gray-600 mt-4 mb-2">User: {@user_id}</p>
    <hr />
    <br />
    <div id="solid" phx-hook="SolHook" phx-update="ignore"></div>
    """
  end

  def mount(_params, session, socket) do
    %{"user_id" => user_id} = session

    if connected?(socket) do
      PubSub.subscribe(Solidyjs.PubSub, "bc_stock")
    end

    {:ok,
     socket
     |> assign(%{global_stock: 10, user_id: user_id})
     |> push_event("user", %{user_id: user_id, global_stock: 20, max: 20})}
  end

  def handle_params(_, uri, socket) do
    {:noreply, assign(socket, :uri, URI.parse(uri).path)}
  end

  def handle_event("stock", %{"user_id" => userid} = map, socket) do
    cond do
      socket.assigns.user_id == String.to_integer(userid) ->
        c = Map.get(map, "c")

        :ok =
          PubSub.broadcast(
            Solidyjs.PubSub,
            "bc_stock",
            {:new_stock, %{c: c, from_user_id: userid}}
          )

        {:noreply, assign(socket, :global_stock, c)}

      true ->
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
      {:noreply, socket}
    end
  end
end
