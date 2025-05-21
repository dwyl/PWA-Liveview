defmodule LiveviewPwa.CounterChannel do
  use Phoenix.Channel
  alias LiveviewPwa.Counter
  require Logger

  @moduledoc """
  Channel for collaborative counter with offline/online support.
  Does NOT use Yjs/Yex server-side: only receives "clicks" deltas and sends back the authoritative counter.
  """

  @impl true
  def join("counter", params, socket) do
    user_id = params["userID"]
    max = params["max"]
    dbg(max)
    Logger.info("#{user_id} joined Counter channel")
    # send(self(), :after_join)
    {:ok, assign(socket, %{user_id: user_id, max: max})}
  end

  @impl true
  def handle_in("init-client", %{"clicks" => clicks}, socket)
      when is_integer(clicks) and clicks > 0 do
    Logger.debug("[#{socket.assigns.user_id}] init-client with clicks: #{clicks}")
    user_id = socket.assigns.user_id
    # Apply pending clicks if any were sent by the client
    case Counter.get_counter() do
      {:ok, old_counter} ->
        new_counter = old_counter - clicks

        maybe_rescale =
          if new_counter == 0,
            do: socket.assigns.max + 1 + new_counter,
            else: new_counter

        :ok = Counter.set_counter(maybe_rescale)
        # Broadcast the new counter to all clients
        broadcast!(socket, "counter-update", %{"counter" => maybe_rescale, "from" => user_id})
        {:reply, {:ok, %{"counter" => maybe_rescale}}, socket}

      err ->
        Logger.error("Failed to apply clicks on init-client: #{inspect(err)}")
        {:reply, {:error, %{"error" => "Failed to apply clicks"}}, socket}
    end
  end

  def handle_in("init-client", _payload, socket) do
    Logger.info("[#{socket.assigns.user_id}] init-push  void")
    # Standard (re)init: just send the current counter value
    case Counter.get_counter() do
      {:ok, counter} ->
        # push(socket, "counter-update", %{"counter" => counter})
        {:reply, {:ok, %{"counter" => counter}}, socket}

      err ->
        Logger.error("Failed to fetch counter on init-client: #{inspect(err)}")
        {:reply, {:error, %{"error" => "Failed to fetch counter"}}, socket}
    end
  end

  def handle_in("client-update", %{"clicks" => clicks}, socket)
      when is_integer(clicks) and clicks > 0 do
    user_id = socket.assigns.user_id

    case Counter.get_counter() do
      {:ok, old_db_counter} ->
        new_counter = old_db_counter - clicks

        maybe_rescale =
          if new_counter < 0,
            do: socket.assigns.max + 1 + new_counter,
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

  # Fallback for invalid/missing clicks or non-integer/zero
  def handle_in("client-update", payload, socket) do
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
