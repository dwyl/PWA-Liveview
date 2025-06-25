defmodule LiveviewPwaWeb.NotFoundController do
  use LiveviewPwaWeb, :controller

  @moduledoc """
    This module handles the rendering of a 404 Not Found page.
  """
  def display(conn, _assigns) do
    # image_path = Path.join(:code.priv_dir(:liveview_pwa), Vite.path("images/p404.webp"))

    conn
    |> put_status(:not_found)
    |> put_layout(html: {LiveviewPwaWeb.Layouts, :app})
    |> render(:not_found)
  end
end
