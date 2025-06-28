defmodule LiveviewPwa.Sql3CounterChannel do
  @moduledoc """
  Channel for collaborative counter with offline/online support.
  Does NOT use Yjs/Yex server-side: only receives "clicks" deltas and sends back the authoritative counter.
  """

  use Phoenix.Channel

  alias LiveviewPwa.Counter

  require Logger

  @impl true
  def join("sql3-counter", %{"max" => max_value, "userID" => user_id} = _params, socket) do
    Logger.info("#{user_id} joined Counter channel")
    {:ok, assign(socket, %{user_id: user_id, max_value: max_value})}
  end

  @impl true
  def handle_in("client-update", %{"clicks" => clicks, "from" => from}, socket)
      when is_integer(clicks) and clicks > 0 do
    user_id = socket.assigns.user_id
    max_value = socket.assigns.max_value
    Logger.debug("[#{user_id}] client-udpate with clicks: #{clicks} from #{from}")

    with {:ok, old_db_counter} <-
           Counter.get_counter(),
         new_counter =
           old_db_counter - clicks,
         rescaled_counter =
           rem(new_counter + max_value + 1, max_value + 1),
         :ok <-
           Counter.set_counter(rescaled_counter) do
      Logger.debug("[#{user_id}] client-update applied #{clicks} clicks: #{old_db_counter} -> #{rescaled_counter}")

      broadcast!(socket, "counter-update", %{"counter" => rescaled_counter, "from" => user_id})
      {:reply, {:ok, %{"counter" => rescaled_counter}}, socket}
    else
      err ->
        Logger.error("Failed to apply clicks: #{inspect(err)}")
        {:stop, :shutdown, {:error, %{"error" => "Failed to apply clicks"}}, socket}
    end
  end

  # Fallback no clicks
  def handle_in("client-update", _, socket) do
    case Counter.get_counter() do
      {:ok, counter} ->
        Logger.debug("[#{socket.assigns.user_id}] client-udpate with no clicks: sending current counter #{counter}")

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
