defmodule LiveviewPwaWeb.UserSocket do
  use Phoenix.Socket

  alias LiveviewPwa.User
  alias LiveviewPwaWeb.Endpoint

  require Logger

  channel "pg-counter", LiveviewPwaWeb.PgCounterChannel
  channel "sql3-counter", LiveviewPwaWeb.Sql3CounterChannel
  channel "proxy:presence", LiveviewPwa.PresenceChannel
  channel "users_socket:*", LiveviewPwaWeb.UserChannel

  @impl true
  # def connect(%{"userToken" => user_token}, socket, connect_info) do
  def connect(_, socket, connect_info) do
    salt = User.access_salt()
    access_ttl = User.access_ttl()

    %{session: %{"user_token" => user_token, "user_id" => user_id}} = connect_info

    with %{id: ^user_id, is_valid: true} <-
           User.lookup(user_token),
         {:ok, ^user_id} <-
           Phoenix.Token.verify(Endpoint, salt, user_token, max_age: access_ttl) do
      {:ok, assign(socket, %{user_id: user_id, user_token: user_token})}
    else
      _msg ->
        User.revoke(user_token)
        topic = "users_socket:#{user_id}"
        Phoenix.PubSub.broadcast(:pubsub, topic, :disconnect)

        {:error, :invalid_token}
    end
  end

  @impl true
  def id(socket) do
    "users_socket:#{socket.assigns.user_id}"
  end
end
