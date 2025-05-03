defmodule SolidyjsWeb.MountUserId do
  # import Phoenix.LiveView
  import Phoenix.Component

  @moduledoc """
  This module is used to mount the user_id from the session into the socket.
  It is used in the LiveView modules (same session, Map & Stock)
  so is available in the socket assigns.
  It is then set as a data attribute in the DOM for the client code.
  """
  def on_mount(:ensure_authenticated, _params, session, socket) do
    user_id = Map.get(session, "user_id")
    user_token = Map.get(session, "user_token")

    if !user_id or !user_token do
      {:halt, Phoenix.LiveView.redirect(socket, to: "/404")}
    else
      {:cont,
       assign(socket, %{
         user_id: user_id,
         user_token: user_token,
         update_available: false
       })}
    end
  end
end
