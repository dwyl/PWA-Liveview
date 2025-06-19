# defmodule LiveviewPwa.YjsChannel do
#   use Phoenix.Channel
#   # alias Yex.Sync.SharedDoc

#   alias LiveviewPwa.DocHandler
#   require Logger

#   @moduledoc """
#   Yjs channel for bridging the Yjs client document
#   and the mirrored Yjs document in the database.
#   - It uses binary payloads to send and receive updates.
#   - It uses explicit clicks-delta protocol: client sends number
#   of clicks (decrements), server applies delta and broadcasts new state.
#   """

#   @impl true
#   def join("yjs-state", params, socket) do
#     user_id = params["userID"]
#     max = params["max"]
#     Logger.info("#{user_id} Joined Yjs channel")
#     send(self(), :after_join)
#     {:ok, assign(socket, %{user_id: user_id, max: max})}
#   end

#   @impl true
#   def handle_info(:after_join, socket) do
#     if DocHandler.get_y_doc() == {:ok, ""} do
#       case instantiate_db(socket.assigns.max) do
#         :done ->
#           {:noreply, socket}

#         :error ->
#           Logger.error("Failed to instantiate yjs_documents")

#           {:stop, :shutdown, {:error, %{"error" => "Failed to instantiate yjs_documents"}},
#            socket}
#       end
#     else
#       {:noreply, socket}
#     end
#   end

#   defp instantiate_db(max) do
#     # no error guard, todo
#     ydoc = Yex.Doc.new()
#     map = Yex.Doc.get_map(ydoc, "data")
#     :ok = Yex.Map.set(map, "counter", max)
#     {:ok, update} = Yex.encode_state_as_update(ydoc)
#     DocHandler.update_doc(update)
#   end

#   @impl true
#   def handle_in("init-client", %{}, socket) do
#     with {:ok, {ydoc, _}} <-
#            build_ydoc_from_db(),
#          {:ok, bin} <-
#            Yex.encode_state_as_update(ydoc),
#          :ok <-
#            push(socket, "pub-update", {:binary, bin}) do
#       {:reply, :ok, socket}
#     else
#       err ->
#         Logger.error("Failed to encode Yjs state: #{inspect(err)}")
#         {:stop, :shutdown, {:error, %{"error" => "Failed to encode Yjs state"}}, socket}
#     end
#   end

#   def handle_in("yjs-update", %{"clicks" => clicks}, socket)
#       when is_integer(clicks) and clicks > 0 do
#     Logger.debug("Received clicks delta from client: #{clicks} by #{socket.assigns.user_id}")

#     with {:ok, {ydoc, _db_doc}} <- build_ydoc_from_db(),
#          {:ok, old_db_counter} <- get_current_value_from(ydoc) do
#       new_counter = old_db_counter - clicks

#       Yex.Doc.get_map(ydoc, "data")
#       |> Yex.Map.set("counter", new_counter)
#       |> dbg()

#       # Remove clicks from ydoc before storing (we only store counter!)
#       # Yex.Map.delete(Yex.Doc.get_map(ydoc, "data"), "clicks")

#       {:ok, merged_doc} = Yex.encode_state_as_update(ydoc)

#       case DocHandler.update_doc(merged_doc) do
#         :done ->
#           # Broadcast the new counter to all clients (as Yjs binary update)
#           :ok = broadcast_from(socket, "pub-update", {:binary, merged_doc})
#           {:reply, {:ok, %{"counter" => new_counter}}, socket}

#         :error ->
#           Logger.error("Failed to save Yjs update")
#           {:stop, :shutdown, {:error, %{"error" => "Failed to save Yjs update"}}, socket}
#       end
#     else
#       err ->
#         Logger.error("Failed to handle clicks update: #{inspect(err)}")
#         {:stop, :shutdown, {:error, %{"error" => "Failed to handle clicks update"}}, socket}
#     end
#   end

#   # If no clicks or invalid data, just reply with server state
#   def handle_in("yjs-update", _payload, socket) do
#     Logger.warning("Received invalid or empty clicks payload")

#     with {:ok, {ydoc, db_doc}} <- build_ydoc_from_db(),
#          {:ok, _counter} <- get_current_value_from(ydoc),
#          {:ok, bin} <- Yex.encode_state_as_update(ydoc),
#          :ok <- push(socket, "pub-update", {:binary, bin}) do
#       {:reply, :ok, socket}
#     else
#       err ->
#         Logger.error("Failed to send current state: #{inspect(err)}")
#         {:stop, :shutdown, {:error, %{"error" => "Failed to send current state"}}, socket}
#     end
#   end

#   defp build_ydoc_from_db() do
#     ydoc = Yex.Doc.new()
#     {:ok, db_doc} = DocHandler.get_y_doc()

#     if db_doc && byte_size(db_doc) > 0 do
#       # Apply the stored state first
#       Yex.apply_update(ydoc, db_doc)
#       Logger.debug("Applied stored document state")
#       {:ok, {ydoc, db_doc}}
#     else
#       Logger.debug("No stored document state found")
#       {:error, :no_ydoc}
#     end
#   end

#   defp get_current_value_from(ydoc) do
#     case Yex.Doc.get_map(ydoc, "data") |> Yex.Map.fetch("counter") do
#       {:ok, value} -> {:ok, value}
#       :error -> {:error, nil}
#     end
#   end

#   defp get_curent_value_from!(ydoc) do
#     case Yex.Doc.get_map(ydoc, "data") |> Yex.Map.fetch("counter") do
#       {:ok, value} -> value
#       :error -> nil
#     end
#   end

#   defp apply_if_lower?(old_value, new_value) do
#     cond do
#       # No old value, always apply
#       old_value == nil -> true
#       # No new value, don't apply (shouldn't happen)
#       new_value == nil -> false
#       new_value == 20.0 -> true
#       # "Lowest wins" - only apply if new value is lower
#       true -> new_value <= old_value
#     end
#   end

#   @impl true
#   def terminate(msg, socket) do
#     # Process.demonitor(socket.assigns.ref, [:flush])
#     Logger.info("#{socket.assigns.user_id},  Channel terminated: #{inspect({msg})}")
#   end
# end

# # def handle_in("yjs-update", {:binary, update}, socket) when is_binary(update) do
# #   Logger.debug("Received binary Yjs update from client")
# #   # build an ydoc from the database
# #   with {:ok, {ydoc, db_doc}} <-
# #          build_ydoc_from_db(),

# #        # Get existing counter value before applying updates
# #        {:ok, old_value} <-
# #          get_current_value_from(ydoc),
# #        :ok <-
# #          Yex.apply_update(ydoc, update),
# #        # Get the new counter value after applying updates
# #        {:ok, new_value} <-
# #          get_current_value_from(ydoc) do
# #     # Check if the update would decrease the counter value

# #     if apply_if_lower?(old_value, new_value) do
# #       Logger.debug(
# #         "Accepting update for #{socket.assigns.user_id}: old=#{inspect(old_value)}, new=#{inspect(new_value)}"
# #       )

# #       {:ok, merged_doc} = Yex.encode_state_as_update(ydoc)

# #       case DocHandler.update_doc(merged_doc) do
# #         :done ->
# #           :ok = broadcast_from(socket, "pub-update", {:binary, update})
# #           {:reply, :ok, socket}

# #         :error ->
# #           Logger.error("Failed to save Yjs update")
# #           {:stop, :shutdown, {:error, %{"error" => "Failed to save Yjs update"}}, socket}
# #       end
# #     else
# #       Logger.debug(
# #         "Rejecting update for #{socket.assigns.user_id()}: Keeping lower value #{inspect(old_value)} vs #{inspect(new_value)}"
# #       )

# #       # Send the current server state back to the client
# #       :ok = push(socket, "pub-update", {:binary, db_doc})
# #       {:noreply, socket}
# #     end
# #   else
# #     err ->
# #       Logger.error("Failed to apply Yjs update: #{inspect(err)}")
# #       {:stop, :shutdown, {:error, %{"error" => "Failed to apply Yjs update"}}, socket}
# #   end
# # end
