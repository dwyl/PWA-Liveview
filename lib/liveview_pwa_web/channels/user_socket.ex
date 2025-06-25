defmodule LiveviewPwa.UserSocket do
  use Phoenix.Socket
  alias LiveviewPwaWeb.Endpoint
  alias LiveviewPwaWeb.Api.UserTokenController, as: ApiUserToken
  require Logger

  channel "pg-counter", LiveviewPwa.PgCounterChannel
  channel "sql3-counter", LiveviewPwa.Sql3CounterChannel
  channel "proxy:presence", LiveviewPwa.PresenceChannel
  # channel "users_token:*", LiveviewPwa.UsersTokenChannel

  @impl true
  @spec connect(map(), any(), any()) :: {:error, any()} | {:ok, Phoenix.Socket.t()}
  def connect(%{"userToken" => user_token}, socket, _connect_info) do
    salt = ApiUserToken.access_salt()
    max_age = ApiUserToken.access_ttl()

    case Phoenix.Token.verify(Endpoint, salt, user_token, max_age: max_age) do
      {:ok, user_id} ->
        Logger.info("User token verified")
        {:ok, assign(socket, :user_id, user_id)}

      {:error, reason} ->
        Logger.warning("Failed to verify user token: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @impl true
  def id(socket), do: "users_socket:#{socket.assigns.user_id}"
end
