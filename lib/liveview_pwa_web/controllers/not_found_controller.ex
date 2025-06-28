defmodule LiveviewPwaWeb.NotFoundController do
  @moduledoc """
    This module handles the rendering of a 404 Not Found page.
  """
  use LiveviewPwaWeb, :controller

  def display(conn, _assigns) do
    # image_path = Path.join(:code.priv_dir(:liveview_pwa), Vite.path("images/p404.webp"))
    env = Application.fetch_env!(:liveview_pwa, :env)

    conn
    |> assign(:env, env)
    |> put_status(:not_found)
    |> put_layout(html: {LiveviewPwaWeb.Layouts, :app})
    |> render(:not_found)
  end
end
