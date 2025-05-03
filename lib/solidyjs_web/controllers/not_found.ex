defmodule SolidyjsWeb.NotFound do
  use SolidyjsWeb, :controller

  def render(conn, _assigns) do
    send_file(conn, 404, ~p"/assets/p404.webp")
  end
end
