defmodule SolidyjsWeb.StockYLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
  alias SolidyjsWeb.Menu
  require Logger

  @moduledoc """
  LiveView for the stock_y page.
  """

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <p class="text-sm text-gray-600 mt-4 mb-4">User ID: {@user_id}</p>
      <Menu.display update_available={@update_available} />

      <br />
      <div
        id="stock_y"
        phx-hook="StockYHook"
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

    {:ok, assign(socket, %{max: 20, page_title: "Stock"})}
  end

  @impl true
  def handle_params(_params, _url, socket) do
    # uri = URI.new!(url)
    {:noreply, socket}
    # {:noreply, push_event(socket, "navigate", %{path: uri.path})}
  end

  # PWA event handlers ----------------->
  @impl true
  def handle_event("sw-lv-error", %{"error" => error}, socket) do
    Logger.warning("PWA on error")
    {:noreply, put_flash(socket, :error, inspect(error))}
  end

  def handle_event("sw-lv-ready", %{"ready" => true}, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end

  def handle_event("sw-lv-update", %{"update" => true}, socket) do
    {:noreply, assign(socket, update_available: true)}
  end

  def handle_event("sw-lv-change", %{"changed" => true}, socket) do
    Logger.debug("PWA on change")

    {:noreply,
     socket
     |> put_flash(:info, "PWA changed")
     |> assign(update_available: true)}
  end
end
