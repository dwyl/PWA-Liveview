defmodule LiveviewPwaWeb.NotFound do
  use LiveviewPwaWeb, :controller

  @moduledoc """
    This module handles the rendering of a 404 Not Found page.
  """
  def render(conn, _assigns) do
    send_file(
      conn,
      404,
      Path.join([:code.priv_dir(:liveview_pwa), "static", ViteHelper.path("images/p404.webp")])
    )
  end
end
