defmodule LiveviewPwaWeb.Api.WasmController do
  use LiveviewPwaWeb, :controller

  def load(conn, _params) do
    path = ViteHelper.path("wasm/great_circle.wasm")

    %Plug.Conn{
      conn
      | resp_headers: [{"Content-Type", "application/wasm"} | conn.resp_headers]
    }
    |> send_file(200, path)
  end
end
