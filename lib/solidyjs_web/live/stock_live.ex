defmodule SolidyjsWeb.StockLive do
  use SolidyjsWeb, :live_view
  alias Phoenix.PubSub
  alias Solidyjs.Stock
  alias SolidyjsWeb.Menu

  @max 20

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
      <%!-- <p class="text-sm text-gray-600 mt-4 mb-2">Remaing stock: {@global_stock}</p> --%>
      <hr />
      <br />
      <div id="stock" phx-hook="YHook" phx-update="ignore" data-userid={@user_id}></div>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "stock")
      {value, state} = Solidyjs.Stock.get_stock()

      {:ok,
       push_event(socket, "init_stock", %{
         value: value,
         state: state,
         max: @max
       })}
    else
      {:ok, socket}
    end
  end

  @impl true
  def handle_info({:y_update, value, y_state}, socket) do
    {:noreply,
     push_event(socket, "sync_stock", %{
       value: value,
       state: y_state
     })}
  end

  @impl true
  def handle_event("sync_state", %{"value" => value, "state" => encoded_state}, socket) do
    Stock.update_stock(value, encoded_state)
    {:noreply, socket}
  end

  def handle_event("offline ready", %{"msg" => msg}, socket) do
    {:noreply, put_flash(socket, :info, msg)}
  end

  def handle_event("accept-refresh", _, socket) do
    {:noreply, push_event(socket, "refreshed", %{})}
  end
end
