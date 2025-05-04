defmodule Solidyjs.YdocSocket do
  use Phoenix.Socket
  require Logger

  channel "yjs-state", Solidyjs.YjsChannel

  @impl true
  def connect(%{"userToken" => user_token}, socket) do
    case Phoenix.Token.verify(SolidyjsWeb.Endpoint, "user token", user_token, max_age: 86_400) do
      {:ok, user_id} ->
        Logger.debug("User token verified")
        {:ok, assign(socket, :user_id, user_id)}

      {:error, _reason} ->
        Logger.error("Failed to verify user token")
        :error
    end
  end

  @impl true
  def id(_socket), do: nil
end
