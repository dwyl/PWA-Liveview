defmodule LiveviewPwaWeb.PgCounterController do
  use LiveviewPwaWeb, :controller

  def show(conn, _params) do
    %{counter: v} = LiveviewPwa.ElecCount.current()
    json(conn, %{counter: v})
  end
end
