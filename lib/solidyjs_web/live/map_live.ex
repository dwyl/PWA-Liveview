defmodule SolidyjsWeb.MapLive do
  use SolidyjsWeb, :live_view
  use Phoenix.Component
  alias Phoenix.LiveView.AsyncResult
  alias Phoenix.PubSub
  alias SolidyjsWeb.{Menu, Pwa}
  # import SolidyjsWeb.CoreComponents, only: [button: 1]

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
      <button
        :if={@update_available}
        type="button"
        class="flex flex-row px-4 mb-4 mt-4 py-2 border-2 rounded-md text-midnightblue  bg-blue-200  hover:bg-bisque transition-colors duration-300"
        id="refresh-button"
        phx-click="skip-waiting"
      >
        <Pwa.svg height={20} class="mr-2" />
        <span class="ml-1 font-bold">Refesh needed</span>
      </button>
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

    {:ok, assign(socket, %{page_title: "Map", airports: nil})}
  end

  @impl true
  def handle_params(_, _uri, socket) do
    {:noreply, socket}
  end

  # airport list setup on mount ---------->

  @impl true
  def handle_async(:fetch_airports, {:ok, fetched_airports}, socket) do
    %{airports: airports} = socket.assigns

    hash =
      :crypto.hash(:sha256, :erlang.term_to_binary(fetched_airports))
      |> Base.encode16()

    true = :ets.insert(:hash, {:hash, hash})

    send(self(), :airports_cleanup)

    {:noreply,
     socket
     |> push_event("airports", %{
       airports: AsyncResult.ok(airports, fetched_airports).result,
       hash: hash
     })
     # memory cleanup
     |> assign(%{airports: nil, hash: hash})}
  end

  def handle_async(:airports, {:exit, reason}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.failed(airports, {:exit, reason}))}
  end

  # Client events ----------------->
  @impl true
  def handle_event("cache-checked", %{"cached" => false}, socket) do
    # Logger.debug("Client data empty, fetch from DB")

    dbg(AsyncResult.loading())

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.loading())
     |> start_async(
       :fetch_airports,
       &fetch_airports/0
     )}
  end

  def handle_event(
        "cache-checked",
        %{"cached" => true, "version" => current_hash},
        socket
      ) do
    if [{:hash, current_hash}] == :ets.lookup(:hash, :hash) do
      # all good, use cached data
      {:noreply, socket}
    else
      #  version does not match, fetch from DB
      {:noreply,
       socket
       |> assign(:airports, AsyncResult.loading())
       |> start_async(
         :fetch_airports,
         &fetch_airports/0
       )}
    end
  end

  # <---------- airport list logic

  # PWA event handlers ----------------->

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

  def handle_event("skip-waiting", _params, socket) do
    {:noreply, push_event(socket, "sw-lv-skip-waiting", %{})}
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

  # cleanup the async result
  def handle_info(:airports_cleanup, socket) do
    send(socket.transport_pid, :garbage_collect)
    {:noreply, assign(socket, airports: nil)}
  end

  # Helpers------------------------------>
  defp fetch_airports do
    Airport.municipalities()
  end
end
