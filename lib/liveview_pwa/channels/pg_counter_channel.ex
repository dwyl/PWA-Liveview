defmodule LiveviewPwa.PgCounterChannel do
  use Phoenix.Channel
  alias LiveviewPwa.PhxSyncCount
  require Logger

  @moduledoc """
  Channel for collaborative counter with offline/online support.
  Uses Yjs/Yex server-side: receives "clicks" deltas and sends back the authoritative counter.
  """
  @impl true
  def join("pg-counter", %{"max" => max_value, "userID" => user_id} = _params, socket) do
    Logger.info("#{user_id} joined PgCounter channel")
    {:ok, assign(socket, %{user_id: user_id, max_value: max_value})}
  end

  @impl true
  def handle_in("client-clicks", %{"clicks" => clicks}, socket) do
    {:ok, new_val} = PhxSyncCount.decrement(clicks)
    Logger.info("channel client-clicks----------->: #{inspect(clicks)}, #{inspect(new_val)}")

    {:reply, {:ok, %{new_val: new_val}}, socket}
  end
end
