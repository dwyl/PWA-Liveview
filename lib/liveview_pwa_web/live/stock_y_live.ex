defmodule LiveviewPwaWeb.StockYjsLive do
  use LiveviewPwaWeb, :live_view
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.HeaderComponent
  require Logger

  @moduledoc """
  LiveView for the stock_y page.
  """

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component
        module={HeaderComponent}
        id="pwa_action-0"
        update_available={@update_available}
        user_id={@user_id}
        presence_list={@presence_list}
        active_path={@active_path}
      />

      <br />
      <div
        id="stock_y"
        phx-hook="StockYjsHook"
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

    {:ok, assign(socket, %{page_title: "Stock"})}
  end

  @impl true
  def handle_params(_params, url, socket) do
    path = URI.new!(url) |> Map.get(:path)
    {:noreply, assign(socket, :active_path, path)}
  end

  # Presence tracking ----------------->
  @impl true
  def handle_info(
        %{event: "presence_diff", payload: %{joins: joins, leaves: leaves}},
        socket
      ) do
    %{assigns: %{presence_list: presence_list}, id: id} = socket

    new_list =
      LiveviewPwaWeb.Presence.sieve(presence_list, joins, leaves, id)

    {:noreply, assign(socket, presence_list: new_list)}
  end

  def handle_info(:sw_ready, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end
end
