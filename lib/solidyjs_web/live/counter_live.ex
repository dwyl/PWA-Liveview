defmodule SolidyjsWeb.CounterLive do
  use SolidyjsWeb, :live_view

  def render(assigns) do
    ~H"""
    <h1>Phoenix Static</h1>
    <div id="solid" phx-hook="SolHook" phx-update="ignore"></div>
    """
  end

  def mount(_params, _session, socket) do
    user_id = 1

    {:ok,
     socket
     |> assign(%{count: 0, user_id: user_id})
     |> push_event("user", %{user_id: user_id})}
  end

  def handle_event("stock", %{"user_id" => userid} = map, socket) do
    IO.inspect(socket.assigns.user_id |> to_string())
    IO.inspect(map)

    cond do
      socket.assigns.user_id == String.to_integer(userid) ->
        {:noreply, assign(socket, :co, Map.get(map, :c))}

      true ->
        {:noreply, socket}
    end
  end

  def handle_event("stock", %{}, socket) do
    {:noreply, socket}
  end
end
