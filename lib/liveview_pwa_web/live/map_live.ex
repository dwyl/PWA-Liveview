defmodule LiveviewPwaWeb.MapLive do
  use LiveviewPwaWeb, :live_view
  use Phoenix.Component
  alias Phoenix.LiveView.AsyncResult
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.{Menu, Presence, PwaActionComponent, Users}
  # import LiveviewPwaWeb.CoreComponents, only: [button: 1]

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
      <.live_component
        module={PwaActionComponent}
        id="pwa_action-0"
        update_available={@update_available}
      />
      <Users.display user_id={@user_id} presence_list={@presence_list} />
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
      # :ok = PubSub.subscribe(:pubsub, "presence")
      # <- presence tracking
      Presence.track(self(), "presence", socket.assigns.user_id, %{})
      init_presence_list = Presence.list("presence") |> Map.keys()

      {:ok,
       assign(socket, %{
         presence_list: init_presence_list,
         page_title: "Map",
         airports: nil,
         hash: Airport.hash()
       })}
    else
      {:ok, socket}
    end
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

    Airport.put_hash(hash)

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

  # Client events
  @impl true
  def handle_event("cache-checked", %{"cached" => false}, socket) do
    # Logger.debug("Client data empty, fetch from DB")

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
  def handle_event(
        "cache-checked",
        %{"cached" => true, "version" => hash},
        socket
      ) do
    Logger.info("#{inspect({hash, socket.assigns.hash})}")
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
  def handle_info(
        %{event: "presence_diff", payload: %{joins: joins, leaves: leaves}},
        socket
      ) do
    %{assigns: %{presence_list: presence_list}, id: id} = socket

    new_list =
      LiveviewPwaWeb.Presence.sieve(presence_list, joins, leaves, id)

    {:noreply, assign(socket, presence_list: new_list)}
  end

  def handle_info(%{"action" => action} = payload, socket) do
    user_id = socket.assigns.user_id
    from = Map.get(payload, "origin_user_id")

    Logger.info("#{user_id} Received PubSub event: #{action} from #{from}")

    # delete action has no "from" field as it applies to all clients
    if user_id != from do
      {:noreply, push_event(socket, action, payload)}
    else
      {:noreply, socket}
    end
  end

  def handle_info(:sw_ready, socket) do
    {:noreply, put_flash(socket, :info, "PWA ready")}
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
