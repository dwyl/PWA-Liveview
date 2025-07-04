defmodule LiveviewPwaWeb.UserSocket do
  use Phoenix.Socket

  alias LiveviewPwa.User

  require Logger

  channel "pg-counter", LiveviewPwaWeb.PgCounterChannel
  channel "sql3-counter", LiveviewPwaWeb.Sql3CounterChannel
  channel "proxy:presence", LiveviewPwa.PresenceChannel
  channel "users_socket:*", LiveviewPwaWeb.UserChannel

  @impl true
  def connect(_p, _socket, %{session: nil} = _connect_info) do
    Logger.warning("UserSocket connect called without session")
    {:error, :no_session}
  end

  def connect(_, socket, %{session: session} = _connect_info) do
    %{"user_token" => user_token, "user_id" => user_id} = session

    case authenticate(user_token, user_id) do
      :ok ->
        {:ok, assign(socket, %{user_id: user_id, user_token: user_token})}

      :error ->
        User.revoke_by_token(user_token)
        topic = "users_socket:#{user_id}"
        Phoenix.PubSub.broadcast(:pubsub, topic, :disconnect)
        {:error, :unauthorized}
    end
  end

  @impl true
  def id(socket) do
    "users_socket:#{socket.assigns.user_id}"
  end

  def authenticate(user_token, user_id) do
    with %{id: ^user_id, is_valid: true} <-
           User.lookup(user_token),
         {:ok, ^user_id} <-
           User.check_token(user_token) do
      :ok
    else
      _msg ->
        :error
    end
  end
end
