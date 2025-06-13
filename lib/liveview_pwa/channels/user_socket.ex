defmodule LiveviewPwa.UserSocket do
  use Phoenix.Socket
  alias LiveviewPwaWeb.Endpoint
  require Logger

  channel "pg-counter", LiveviewPwa.PgCounterChannel
  channel "sql3-counter", LiveviewPwa.Sql3CounterChannel
  channel "proxy:presence", LiveviewPwa.PresenceChannel

  @impl true
  def connect(%{"userToken" => user_token}, socket) do
    case Phoenix.Token.verify(Endpoint, "user token", user_token) do
      {:ok, user_id} ->
        Logger.debug("User token verified")
        {:ok, assign(socket, :user_id, user_id)}

      {:error, _reason} ->
        Logger.error("Failed to verify user token")
        :error
    end
  end

  @impl true
  def id(socket), do: to_string(socket.assigns.user_id)
end
