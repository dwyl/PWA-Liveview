defmodule SolidyjsWeb.ManifestController do
  use SolidyjsWeb, :controller

  def serve(conn, _params) do
    %Plug.Conn{
      conn
      | resp_headers: [{"Content-Type", "application/manifest+json"} | conn.resp_headers]
    }
    |> send_file(200, "priv/static/manifest.webmanifest")
    |> halt()
  end
end
