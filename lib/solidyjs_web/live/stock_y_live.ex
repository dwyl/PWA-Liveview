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
      <span id="pwa-flash" phx-hook="PwaFlash"></span>
      <.link
        :if={@update_available}
        href="/"
        class="px-4 mb-4 mt-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
        id="refresh-btn"
      >
        Refresh needed
      </.link>
      <%!-- </div> --%>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
      <Menu.display />

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

  # PWA event handlers
  @impl true
  def handle_event("pwa-error", %{"error" => error}, socket) do
    Logger.warning("PWA on error")
    {:noreply, put_flash(socket, :error, inspect(error))}
  end

  def handle_event("pwa-ready", %{"ready" => true}, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end
end
