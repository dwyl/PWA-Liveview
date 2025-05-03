defmodule Solidyjs.YjsChannel do
  use Phoenix.Channel
  # alias Yex.Sync.SharedDoc

  alias Solidyjs.DocHandler
  require Logger

  @moduledoc """
  Yjs channel for bridging the Yjs client document
  and the mirrored Yjs document in the database.
  It uses binary payloads to send and receive updates.
  """

  @impl true
  def join("yjs-state", params, socket) do
    user_id = params["userID"]
    max = params["max"]
    Logger.info("#{user_id} Joined Yjs channel")
    send(self(), :after_join)
    {:ok, assign(socket, %{user_id: user_id, max: max})}
  end

  @impl true
  def handle_info(:after_join, socket) do
    db_doc = DocHandler.get_y_doc()
    :ok = push(socket, "init-yjs-state", {:binary, db_doc})
    {:noreply, socket}
  end

  @impl true
  def handle_in("yjs-update", {:binary, update}, socket) when is_binary(update) do
    Logger.info("Received binary Yjs update from client")

    # build an ydoc from the database
    {ydoc, db_doc} = build_ydoc_from_db()

    # Get existing counter value before applying updates
    old_value = get_current_value_from(ydoc)
    Yex.apply_update(ydoc, update)
    # Get the new counter value after applying updates
    new_value = get_current_value_from(ydoc)

    # Check if the update would decrease the counter value

    if apply_if_lower?(old_value, new_value) do
      Logger.info("Accepting update: old=#{inspect(old_value)}, new=#{inspect(new_value)}")
      {:ok, merged_doc} = Yex.encode_state_as_update(ydoc)

      case DocHandler.update_doc(merged_doc) do
        :done ->
          :ok = broadcast_from(socket, "pub-update", {:binary, update})
          {:noreply, socket}

        :error ->
          Logger.error("Failed to save Yjs update")
          {:noreply, socket}
      end
    else
      Logger.info(
        "Rejecting update: Keeping lower value #{inspect(old_value)} vs #{inspect(new_value)}"
      )

      # Send the current server state back to the client
      push(socket, "init-yjs-state", {:binary, db_doc})
      {:noreply, socket}
    end
  end

  defp build_ydoc_from_db() do
    ydoc = Yex.Doc.new()
    db_doc = DocHandler.get_y_doc()

    if db_doc && byte_size(db_doc) > 0 do
      # Apply the stored state first
      Yex.apply_update(ydoc, db_doc)
      Logger.info("Applied stored document state")
    else
      Logger.info("No stored document state found")
    end

    {ydoc, db_doc}
  end

  defp get_current_value_from(ydoc) do
    case Yex.Doc.get_map(ydoc, "data") |> Yex.Map.fetch("counter") do
      {:ok, value} -> value
      :error -> nil
    end
  end

  defp apply_if_lower?(old_value, new_value) do
    cond do
      # No old value, always apply
      old_value == nil -> true
      # No new value, don't apply (shouldn't happen)
      new_value == nil -> false
      new_value == 20.0 -> true
      # "Lowest wins" - only apply if new value is lower
      true -> new_value <= old_value
    end
  end

  @impl true
  def terminate(msg, socket) do
    # Process.demonitor(socket.assigns.ref, [:flush])
    Logger.info("#{socket.assigns.user_id},  Channel terminated: #{inspect({msg})}")
  end
end
