defmodule LiveviewPwaWeb.UserChannel do
  use LiveviewPwaWeb, :channel
  require Logger

  @impl true
  def join("users_socket:" <> id, _params, socket) do
    :ok =
      Phoenix.PubSub.subscribe(:pubsub, "users_socket:#{id}")

    {:ok, assign(socket, :user_id, id)}
  end

  @impl true
  def handle_info(msg, socket) do
    Logger.debug("#{inspect(msg)}")
    {:noreply, socket}
  end
end
