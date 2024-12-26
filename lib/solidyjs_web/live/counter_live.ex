defmodule SolidyjsWeb.CounterLive do
  use SolidyjsWeb, :live_view

  def render(assigns) do
    ~H"""
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
end
