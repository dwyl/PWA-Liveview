defmodule SolidyjsWeb.NotFound do
  use SolidyjsWeb, :controller

  @moduledoc """
    This module handles the rendering of a 404 Not Found page.
  """
  def render(conn, _assigns) do
    send_file(
      conn,
      404,
      Path.join([:code.priv_dir(:solidyjs), "static", ViteHelper.path("images/p404.webp")])
    )
  end
end
