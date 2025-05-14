defmodule LiveviewPwaWeb.MountUserId do
  # import Phoenix.LiveView
  alias LiveviewPwaWeb.Presence
  import Phoenix.Component
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

    # l = Presence.list("presence") |> dbg()

    # list =
    #   case l = Presence.list("presence") do
    #     %{} -> []
    #     _ -> Map.keys(l)
    #   end
    #   |> dbg()

    if !user_id or !user_token do
      {:halt, Phoenix.LiveView.redirect(socket, to: "/404")}
    else
      {:cont,
       assign(socket, %{
         max: @max,
         user_id: user_id,
         user_token: user_token,
         update_available: false,
         presence_list: Presence.list("presence") |> Map.keys()
       })}
    end
  end
end
