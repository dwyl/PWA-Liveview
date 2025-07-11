defmodule LiveviewPwaWeb.LoginController do
  use LiveviewPwaWeb, :controller

  alias LiveviewPwa.User

  require Logger

  @doc """
  POST endpoint to set the session with a user token and refresh token in a cookie
  """
  def set_session(conn, _params) do
    user =
      Map.get(conn.assigns, :user_id, nil) |> User.get_or_create_user()

    os = get_session(conn, :os) || "unknown"

    case User.add_token(%User{} = user) do
      {:ok, user} ->
        conn
        |> configure_session(renew: true)
        |> clear_session()
        |> put_session(:os, os)
        |> put_session(:user_id, user.id)
        |> put_session(:user_token, user.access_token)
        |> redirect(to: ~p"/", replace: false)

      :error ->
        conn
        |> put_flash(:error, "Failed to create user session")
        |> redirect(to: ~p"/")
    end
  end
end
