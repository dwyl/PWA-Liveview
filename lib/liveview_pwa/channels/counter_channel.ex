defmodule LiveviewPwa.CounterChannel do
  use Phoenix.Channel
  alias LiveviewPwa.Counter
  require Logger

  @moduledoc """
  Channel for collaborative counter with offline/online support.
  Does NOT use Yjs/Yex server-side: only receives "clicks" deltas and sends back the authoritative counter.
  """

  @impl true
  def join("counter", %{"max" => max_value, "userID" => user_id} = _params, socket) do
    Logger.info("#{user_id} joined Counter channel")
    {:ok, assign(socket, %{user_id: user_id, max_value: max_value})}
  end

  @impl true
  def handle_in("client-update", %{"clicks" => clicks, "from" => from}, socket)
      when is_integer(clicks) and clicks > 0 do
    user_id = socket.assigns.user_id
    max_value = socket.assigns.max_value
    Logger.debug("[#{user_id}] client-udpate with clicks: #{clicks} from #{from}")

    case Counter.get_counter() do
      {:ok, old_db_counter} ->
        new_counter = old_db_counter - clicks

        maybe_rescale =
          if new_counter < 0,
            do: max_value + 1 + new_counter,
            else: new_counter

        :ok = Counter.set_counter(maybe_rescale)

        Logger.debug(
          "[#{user_id}] client-udpate applied #{clicks} clicks: #{old_db_counter} -> #{maybe_rescale}"
        )

        # Broadcast new counter to all except himself
        broadcast!(socket, "counter-update", %{"counter" => maybe_rescale, "from" => user_id})

        # Respond to sender
        {:reply, {:ok, %{"counter" => maybe_rescale}}, socket}

      err ->
        Logger.error("Failed to apply clicks: #{inspect(err)}")
        {:stop, :shutdown, {:error, %{"error" => "Failed to apply clicks"}}, socket}
    end
  end

  # Fallback no clicks
  def handle_in("client-update", _, socket) do
    case Counter.get_counter() do
      {:ok, counter} ->
        Logger.debug(
          "[#{socket.assigns.user_id}] client-udpate with no clicks: sending current counter #{counter}"
        )

        {:reply, {:ok, %{"counter" => counter}}, socket}

      err ->
        Logger.error("Failed to send fallback counter: #{inspect(err)}")
        {:stop, :shutdown, {:error, %{"error" => "Failed to send fallback counter"}}, socket}
    end
  end

  @impl true
  def terminate(msg, socket) do
    Logger.info("#{socket.assigns.user_id} channel terminated: #{inspect(msg)}")
  end
end
