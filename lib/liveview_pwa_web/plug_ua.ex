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
    case get_session(conn, :user_agent) do
      nil ->
        os =
          conn
          |> Plug.Conn.get_req_header("user-agent")
          |> List.first()
          |> UAParser.parse()
          |> Map.get(:os)
          |> Map.get(:family)

        put_session(conn, :os, os)

      _ ->
        conn
    end
  end
end
