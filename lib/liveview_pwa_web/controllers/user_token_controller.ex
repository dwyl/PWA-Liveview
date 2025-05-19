defmodule LiveviewPwaWeb.UserTokenController do
  use LiveviewPwaWeb, :controller

  def show(conn, _params) do
    user_token = get_session(conn, :user_token)

    if user_token do
      json(conn, %{user_token: user_token})
    else
      conn
      |> put_status(:unauthorized)
      |> json(%{error: "Not logged in"})
    end
  end
end
