defmodule SolidyjsWeb.CheckOnline do
  use SolidyjsWeb, :controller

  def test(conn, _params) do
    json(conn, %{ok: 200})
  end
end
