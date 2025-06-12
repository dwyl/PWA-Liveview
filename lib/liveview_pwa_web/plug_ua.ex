defmodule PlugUA do
  @moduledoc """
  This module is a Plug that sets the User-Agent header for the request.
  It can be used to identify the type of client making the request.
  """

  @behaviour Plug
  import Plug.Conn

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    ua =
      conn
      |> Plug.Conn.get_req_header("user-agent")
      |> List.first()
      |> UAParser.parse()

    case get_session(conn, :user_agent) do
      nil ->
        conn
        |> put_session(:user_agent, ua)

      _ ->
        conn
    end
  end
end
