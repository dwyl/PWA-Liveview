defmodule SolidyjsWeb.NotFound do
  use SolidyjsWeb, :controller

  @moduledoc """
    This module handles the rendering of a 404 Not Found page.
  """
  def render(conn, _assigns) do
    send_file(conn, 404, ~p"/assets/p404.webp")
  end
end
