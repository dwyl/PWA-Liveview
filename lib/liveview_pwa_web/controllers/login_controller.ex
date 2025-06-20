defmodule LiveviewPwaWeb.LoginController do
  use LiveviewPwaWeb, :controller
  require Logger
  alias LiveviewPwaWeb.Api.UserTokenController, as: ApiUserToken
  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  # version Controller
  # def login(conn, _params) do
  #   os_family = "unknown"

  #   Plug.CSRFProtection.get_csrf_token()
  #   id = get_session(conn, :user_id) |> dbg()

  #   conn
  #   |> put_layout(html: {LiveviewPwaWeb.Layouts, :app})
  #   |> assign(:os, os_family)
  #   |> assign(:user_id, id)
  #   |> render(:login)
  # end

  @doc """
  POST endpoint to set the session with a user token and refresh token in a cookie
  """
  def set_session(conn, _params) do
    user_id = to_string(:rand.uniform(1_000_000))
    access_salt = ApiUserToken.access_salt()
    refresh_salt = ApiUserToken.refresh_salt()

    access_token =
      Token.sign(Endpoint, access_salt, user_id, max_age: ApiUserToken.access_ttl())

    refresh_token =
      Token.sign(Endpoint, refresh_salt, user_id, max_age: ApiUserToken.refresh_ttl())

    delete_csrf_token()

    conn
    |> configure_session(renew: true)
    |> clear_session()
    |> put_session(:os, "unknown")
    |> put_session(:user_id, user_id)
    |> put_session(:user_token, access_token)
    |> put_resp_cookie("refresh", refresh_token,
      http_only: true,
      secure: true,
      same_site: "Strict"
    )
    |> redirect(to: ~p"/")
  end
end
