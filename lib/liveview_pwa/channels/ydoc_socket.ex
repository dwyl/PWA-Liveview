defmodule LiveviewPwa.YdocSocket do
  use Phoenix.Socket
  require Logger

  channel "yjs-state", LiveviewPwa.YjsChannel

  @impl true
  def connect(%{"userToken" => user_token}, socket) do
    case Phoenix.Token.verify(LiveviewPwaWeb.Endpoint, "user token", user_token, max_age: 86_400) do
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
