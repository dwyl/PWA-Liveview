defmodule LiveviewPwaWeb.Api.ConnectivityController do
  use LiveviewPwaWeb, :controller

  def check(conn, _params) do
    send_resp(conn, 200, "online")
  end
end
