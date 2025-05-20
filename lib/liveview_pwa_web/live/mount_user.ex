defmodule LiveviewPwaWeb.MountUser do
  import Phoenix.LiveView
  import Phoenix.Component
  require Logger

  @max 20

  @moduledoc """
  This module is used for shared features between the LiveView modules.
  in the same sesson.

  - assigns the user_id from the session into the socket
  - subscribe to the presence channel and the presence tracker
  - handle the presence diff events,

  """

  def on_mount(:ensure_authenticated, _params, %{"user_id" => user_id}, socket) do
    if connected?(socket) do
      # :ok = PubSub.subscribe(:pubsub, "presence")
      # Presence.track(self(), "presence", user_id, %{id: user_id})
    end

    {:cont,
     socket
     |> assign(:max, @max)
     |> assign(:user_id, user_id)
     |> assign(:update_available, false)
     |> attach_hook(:sw, :handle_event, &handle_pwa_event/3)}
  end

  defp handle_pwa_event("sw-lv-ready", _, socket) do
    {:halt, put_flash(socket, :info, "Service Worker ready")}
  end

  defp handle_pwa_event("sw-lv-error", _, socket) do
    {:halt, put_flash(socket, :error, "Service Worker error. This app can't work offline")}
  end

  defp handle_pwa_event(_, _, socket) do
    {:cont, socket}
  end
end
