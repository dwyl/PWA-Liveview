defmodule LiveviewPwaWeb.MountUser do
  import Phoenix.LiveView
  import Phoenix.Component, only: [assign: 2]
  alias Phoenix.PubSub
  alias LiveviewPwaWeb.Presence
  require Logger

  @max 20

  @moduledoc """
  This module is used to mount the user_id from the session into the socket.
  It is used in the LiveView modules (same session, Map & Stock)
  so is available in the socket assigns.
  It is then set as a data attribute in the DOM for the client code.
  """
  def on_mount(:ensure_authenticated, _params, session, socket) do
    user_id = Map.get(session, "user_id")
    user_token = Map.get(session, "user_token")

    if connected?(socket) do
      :ok = PubSub.subscribe(:pubsub, "presence")
      Presence.track(self(), "presence", user_id, %{})
    end

    if !user_id or !user_token do
      {:halt, redirect(socket, to: "/404")}
    else
      {
        :cont,
        socket
        |> assign(%{
          max: @max,
          user_id: user_id,
          user_token: user_token,
          update_available: false,
          presence_list: Presence.list("presence") |> Map.keys()
        })
        #
        |> attach_hook(:sw, :handle_event, fn
          "sw-lv-ready", _, socket ->
            {:halt, put_flash(socket, :info, "Service Worker ready")}

          "sw-lv-error", _, socket ->
            {:halt,
             put_flash(socket, :error, "Service Worker error. This app can't work offline")}

          _, _, socket ->
            {:cont, socket}
        end)
      }
    end
  end
end
