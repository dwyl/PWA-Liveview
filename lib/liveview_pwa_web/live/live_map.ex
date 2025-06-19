defmodule LiveviewPwaWeb.MapLive do
  use LiveviewPwaWeb, :live_view
  use Phoenix.Component
  alias Phoenix.LiveView.AsyncResult
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.{Menu, PwaLiveComp, Users}
  # alias LiveviewPwaWeb.Presence

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
      <.live_component module={PwaLiveComp} id="pwa_action-map" update_available={@update_available} />
      <br />
      <Users.display user_id={@user_id} module_id="users-map" />

      <Menu.display active_path={@active_path} />
      <br />
      <p>The map below may not be displayed if the free tier usage is exceeded for the month.</p>
      <br />
      <div
        id="hook-map"
        phx-hook="MapHook"
        phx-update="ignore"
        class="h-64 md:h-80"
        data-userid={@user_id}
      >
      </div>
      <div id="hook-select-form" phx-hook="FormHook" phx-update="ignore" data-userid={@user_id}></div>
    </div>
    """

    # style="height: 300px"
  end

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "new_airport")
      :ok = PubSub.subscribe(:pubsub, "remove_airport")
      :ok = PubSub.subscribe(:pubsub, "do_fly")
    end

    {:ok,
     socket
     |> assign(:page_title, "FlightMap")
     |> assign(:hash, Airport.hash())
     #  |> assign(:airports, nil)
     |> stream_configure(:airports, dom_id: &"airport-#{&1.airport_id}", id: :airport_id)
     |> stream(:airports, [])}
  end

  # airport list setup on mount ---------->

  @impl true
  def handle_async(:fetch_airports, {:ok, fetched_airports}, socket) do
    # %{airports: airports} = socket.assigns

    hash =
      :crypto.hash(:sha256, :erlang.term_to_binary(fetched_airports))
      |> Base.encode16()

    Airport.put_hash(hash)

    # send(self(), :airports_cleanup)

    {:noreply,
     socket
     |> stream(:airports, fetched_airports, reset: true)
     |> assign(:hash, hash)
     |> push_event("airports", %{
       airports: fetched_airports,
       hash: hash
     })}

    #  |> push_event("airports", %{
    #    airports: AsyncResult.ok(airports, fetched_airports).result,
    #    hash: hash
    #  })
    # memory cleanup
  end

  def handle_async(:airports, {:exit, reason}, socket) do
    %{airports: airports} = socket.assigns

    {:noreply,
     socket
     |> assign(:airports, AsyncResult.failed(airports, {:exit, reason}))}
  end

  # Client events
  @impl true
  def handle_event("cache-checked", %{"cached" => false}, socket) do
    {:noreply,
     socket
     |> assign(:airports, AsyncResult.loading())
     |> start_async(
       :fetch_airports,
       &fetch_airports/0
     )}
  end

  # all good cache-checked :ok
  def handle_event(
        "cache-checked",
        %{"cached" => true, "version" => hash},
        %{assigns: %{hash: hash}} = socket
      ) do
    {:noreply, socket}
  end

  # hash don't match
  def handle_event("cache-checked", %{"cached" => true, "version" => hash}, socket) do
    Logger.debug("#{inspect({hash, socket.assigns.hash})}")
    #  version does not match, fetch from DB
    {:noreply,
     socket
     |> assign(:airports, AsyncResult.loading())
     |> start_async(
       :fetch_airports,
       &fetch_airports/0
     )}
  end

  # <---------- airport list logic

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

    Logger.debug("#{user_id} Received PubSub event: #{action} from #{from}")

    # delete action has no "from" field as it applies to all clients
    if user_id != from do
      {:noreply, push_event(socket, action, payload)}
    else
      {:noreply, socket}
    end
  end

  # cleanup the async result. Solution before streams usage
  # def handle_info(:airports_cleanup, socket) do
  #   send(socket.transport_pid, :garbage_collect)
  #   {:noreply, assign(socket, :airports, nil)}
  # end

  # Helpers------------------------------>
  defp fetch_airports do
    Airport.municipalities()
  end
end
