defmodule LiveviewPwaWeb.StockYjsLive do
  use LiveviewPwaWeb, :live_view
  # alias Phoenix.PubSub
  alias LiveviewPwaWeb.{PwaLiveComp, Users, Menu}

  require Logger

  @moduledoc """
  LiveView for the stock_yjs page.
  """

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component module={PwaLiveComp} id="pwa_action-yjs" update_available={@update_available} />
      <br />
      <Users.display user_id={@user_id} module_id="users-yjs" />
      <Menu.display active_path={@active_path} />
      <br />
      <div
        id="hook-yjs-sql3"
        phx-hook="StockYjsChHook"
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
    # if connected?(socket) do
    #   :ok = PubSub.subscribe(:pubsub, "ystock")
    # end

    {:ok, assign(socket, :page_title, "Yjs-SQL3")}
  end
end
