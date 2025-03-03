# defmodule SolidyjsWeb.ManifestController do
#   use SolidyjsWeb, :controller

#   def serve(conn, _params) do
#     static = Path.join(:code.priv_dir(:solidyjs_web), "static")

#     %Plug.Conn{
#       conn
#       | resp_headers: [{"Content-Type", "application/manifest+json"} | conn.resp_headers]
#     }
#     |> send_file(200, static <> "/manifest.webmanifest")
#     |> halt()
#   end
# end
