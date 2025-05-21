defmodule LiveviewPwaWeb.StockYjsLive do
  use LiveviewPwaWeb, :live_view
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.{PwaLiveC, Users, Menu}
  # alias LiveviewPwaWeb.Presence

  require Logger

  @moduledoc """
  LiveView for the stock_y page.
  """

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

      <Users.display user_id={@user_id} module_id="users-yjs" />

      <Menu.display update_available={@update_available} active_path={@active_path} />
      <div
        id="yjs-stock"
        phx-hook="StockJsonHook"
        phx-update="ignore"
        data-userid={@user_id}
        data-max={@max}
      >
      </div>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "ystock")
    end

    {:ok,
     socket
     |> assign(:socket_id, socket.id)
     |> assign(:page_title, "Stock")
     |> assign(:active_path, "/")}
  end
end
