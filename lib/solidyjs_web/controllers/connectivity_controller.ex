defmodule SolidyjsWeb.ConnectivityController do
  use SolidyjsWeb, :controller

  def check(conn, _params) do
    send_resp(conn, 200, "online")
  end
end
