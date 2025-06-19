defmodule LiveviewPwaWeb.Api.PgCounterController do
  use LiveviewPwaWeb, :controller

  def show(conn, _params) do
    %{counter: v} = LiveviewPwa.PhxSyncCount.current()
    json(conn, %{counter: v})
  end
end
