defmodule LiveviewPwa.PresenceChannel do
  @moduledoc """
  Channel for presence tracking.
  This channel tracks user presence and broadcasts the list of users
  currently connected to the channel.
  It uses Phoenix Presence to manage the presence state
  and sends teh Presence list via a Channel.
  """

  use Phoenix.Channel

  alias LiveviewPwa.Presence

  require Logger

  @impl true
  def join("proxy:presence", %{"user_id" => user_id} = _params, socket) do
    send(self(), :after_join)
    {:ok, assign(socket, :user_id, user_id)}
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    {:ok, _} = Presence.track(socket, user_id, %{id: user_id})
    send(self(), :push_users)
    {:noreply, socket}
  end

  def handle_info(:push_users, socket) do
    users = Presence.list(socket)
    #  pass the user_id to the channel
    :ok = push(socket, "user", %{from: socket.assigns.user_id})
    #  push the presence state to the channel
    :ok = push(socket, "presence_state", users)
    {:noreply, socket}
  end
end
