defmodule SolidyjsWeb.MapLive do
  use SolidyjsWeb, :live_view
  use Phoenix.Component
  alias Phoenix.LiveView.AsyncResult
  alias Phoenix.PubSub
  alias SolidyjsWeb.Menu
  import SolidyjsWeb.CoreComponents, only: [button: 1]

  @moduledoc """
  LiveView for the map page.
  This module handles the rendering of the map and the
  form with the client-side JavaScript.
  It subscribes to PubSub events for adding and removing
  airports.

  """
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.button
        :if={@update_available}
        type="button"
        class="px-4 mb-4 mt-4 py-2 border-2 rounded-md text-bisque  bg-midnightblue hover:text-midnightblue hover:bg-bisque transition-colors duration-300"
        id="refresh-button"
        phx-click="skip-waiting"
      >
        Refesh needed: {@update_available}
      </.button>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
      <Menu.display update_available={@update_available} />
      <div
        id="map"
        phx-hook="MapHook"
        phx-update="ignore"
        style="height: 300px"
        data-userid={@user_id}
      >
      </div>
      <div id="select_form" phx-hook="FormHook" phx-update="ignore" data-userid={@user_id}></div>
    </div>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    # user_id is set by "set_user_id" plug
    # and then set in the "on_mount" function
    # os is available in sockets in the same session

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "new_airport")
      :ok = PubSub.subscribe(:pubsub, "remove_airport")
      :ok = PubSub.subscribe(:pubsub, "do_fly")
    end

    {:ok, assign(socket, %{page_title: "Map"})}
  end

  @impl true
  def handle_params(_, uri, socket) do
    Logger.debug("MapLive handle_params: #{inspect(uri)}")

    case URI.parse(uri).path do
      "/map" ->
        {:noreply,
         socket
         |> assign(:airports, AsyncResult.loading())
         |> start_async(
           :fetch_airports,
           fn -> Airport.municipalities() end
         )}

      #  |> push_event("navigate", %{path: "/map"})}

      _ ->
        {:noreply, socket}
    end
  end

  # airport list setup on mount ---------->
  @impl true
  def handle_async(:fetch_airports, {:ok, fetched_airports}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.ok(airports, fetched_airports))
     |> push_event("airports", %{airports: fetched_airports})
     # empty the socket as client will handle the data because
     # otherwise the server will have as much copies as the numbe of clients
     |> assign(:airports, %{})}
  end

  @impl true
  def handle_async(:airports, {:exit, reason}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.failed(airports, {:exit, reason}))}
  end

  # <---------- airport list

  # PWA event handlers ----------------->
  @impl true
  def handle_event("sw-lv-error", %{"error" => error}, socket) do
    Logger.warning("PWA on error")
    {:noreply, put_flash(socket, :error, inspect(error))}
  end

  def handle_event("sw-lv-ready", %{"ready" => true}, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
  end

  def handle_event("lv-sw-update", %{"update" => true}, socket) do
    {:noreply, assign(socket, update_available: true)}
  end

  def handle_event("sw-lv-change", %{"changed" => true}, socket) do
    Logger.debug("PWA on change")

    {:noreply,
     socket
     |> put_flash(:info, "PWA changed")
     |> assign(update_available: true)}
  end

  # Clients Flight events callbacks ----------------->
  def handle_event("fly", %{"userID" => userID} = payload, socket) do
    :ok =
      PubSub.broadcast(
        :pubsub,
        "do_fly",
        Map.merge(payload, %{
          "action" => "do_fly",
          "from" => userID
        })
      )

    {:noreply, socket}
  end

  def handle_event("delete", old_airport, socket) do
    :ok =
      PubSub.broadcast(
        :pubsub,
        "remove_airport",
        Map.merge(old_airport, %{
          "action" => "delete_airports"
        })
      )

    {:noreply, socket}
  end

  def handle_event("add", new_airport, socket) do
    :ok =
      PubSub.broadcast(
        :pubsub,
        "new_airport",
        Map.merge(new_airport, %{
          "action" => "added_airport",
          "origin_user_id" => socket.assigns.user_id
        })
      )

    {:noreply, socket}
  end

  # Generic PubSub callback: pushes response to other clients
  @impl true
  def handle_info(%{"action" => action} = payload, socket) do
    user_id = socket.assigns.user_id
    from = Map.get(payload, "origin_user_id")

    Logger.info("#{user_id} Received PubSub event: #{action} from #{from}")

    if user_id != from do
      {:noreply, push_event(socket, action, payload)}
    else
      {:noreply, socket}
    end
  end
end
