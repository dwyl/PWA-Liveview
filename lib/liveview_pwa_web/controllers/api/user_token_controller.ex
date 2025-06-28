defmodule LiveviewPwaWeb.Api.UserTokenController do
  use LiveviewPwaWeb, :controller

  alias LiveviewPwaWeb.Endpoint
  alias Phoenix.Token

  require Logger

  def access_ttl, do: Application.get_env(:liveview_pwa, :access_token_ttl, 30)

  def refresh_ttl, do: Application.get_env(:liveview_pwa, :refresh_token_ttl, 60)

  def access_salt, do: "user token"
  def refresh_salt, do: "refresh token"

  @doc """
  POST endpoint to get a new access token when it expires
  while sending back the refresh token in a cookie.

  """
  def refresh(conn, %{}) do
    user_id = get_session(conn, :user_id)
    is_maybe_refresh_token = conn.cookies["refresh"]

    with true <- is_maybe_refresh_token != nil,
         {:ok, new_access_token, new_refresh_token} <-
           verify_and_access_refresh(is_maybe_refresh_token, user_id) do
      Logger.debug("User token refreshed successfully")

      # Endpoint.broadcast("users_token:" <> user_id, "access-renewed", %{})

      conn
      |> put_session(:user_token, new_access_token)
      |> put_resp_cookie("refresh", new_refresh_token,
        http_only: true,
        secure: true,
        same_site: "Strict"
      )
      |> json(%{user_token: new_access_token})
    else
      msg ->
        Logger.warning("Refresh token expired or invalid: #{inspect(msg)}")
        # Endpoint.broadcast("users_token:" <> user_id, "disconnect", %{})

        conn
        |> configure_session(drop: true)
        |> clear_session()
        |> put_status(:unauthorized)
        |> json(%{error: "Refresh token expired", type: "refresh"})
        |> halt()
    end
  end

  def verify_and_access_refresh(token, user_id) do
    case Token.verify(Endpoint, refresh_salt(), token, max_age: refresh_ttl()) do
      {:ok, ^user_id} ->
        new_access_token = Token.sign(Endpoint, access_salt(), user_id, max_age: access_ttl())

        new_refresh_token =
          Token.sign(Endpoint, refresh_salt(), user_id, max_age: refresh_ttl())

        {:ok, new_access_token, new_refresh_token}

      {:error, _} ->
        :error
    end
  end
end
