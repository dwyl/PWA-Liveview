# defmodule LiveviewPwaWeb.WasmController do
#   use LiveviewPwaWeb, :controller

#   def load(conn, _params) do
#     IO.puts("WASM-------------")

#     %Plug.Conn{
#       conn
#       | resp_headers: [{"Content-Type", "application/wasm"} | conn.resp_headers]
#     }
#     |> send_file(200, "./priv/static/assets/great_circle.wasm")
#   end
# end
