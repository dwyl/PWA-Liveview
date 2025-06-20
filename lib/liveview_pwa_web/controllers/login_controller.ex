defmodule LiveviewPwaWeb.LoginController do
  use LiveviewPwaWeb, :controller
  require Logger
  alias LiveviewPwaWeb.Api.UserTokenController, as: ApiUserToken
  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  def index(conn, _params) do
    # This is the initial page load, we don't have a user_id yet
    # so we just render the login page with no user_id
    os = get_session(conn, :os) || "unknown"
    id = get_session(conn, :user_id) || nil

    # delete_csrf_token()
    # get_csrf_token()

    conn
    |> put_layout(html: {LiveviewPwaWeb.Layouts, :app})
    |> assign(:os, os)
    |> assign(:user_id, id)
    |> assign(:trigger, false)
    |> assign(:update_available, false)
    |> assign(:user_token, get_session(conn, :user_token))
    |> assign(:page_title, "Login")
    |> assign(:csrf_token, get_csrf_token())
    |> render(:login)
  end

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
    os = get_session(conn, :os) || "unknown"

    conn
    |> configure_session(renew: true)
    |> clear_session()
    |> delete_resp_cookie("_csrf_token")
    |> put_session(:os, os)
    |> put_session(:user_id, user_id)
    |> put_session(:user_token, access_token)
    |> put_resp_cookie("refresh", refresh_token,
      http_only: true,
      secure: true,
      same_site: "Strict"
    )
    |> redirect(to: ~p"/logged-in")
    |> halt()
  end
end

# version Controller
# def logged_in(conn, _params) do
#   os = get_session(conn, :os) |> dbg()
#   id = get_session(conn, :user_id) |> dbg()
#   token = get_session(conn, :user_token) |> dbg()

#   delete_csrf_token()
#   get_csrf_token()

#   conn
#   |> put_layout(html: {LiveviewPwaWeb.Layouts, :app})
#   |> assign(:os, os)
#   |> assign(:user_id, id)
#   |> assign(:user_token, token)
#   |> render(:login)
# end
