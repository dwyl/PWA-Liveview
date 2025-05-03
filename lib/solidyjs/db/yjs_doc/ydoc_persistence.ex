# defmodule Solidyjs.YdocPersistence do
#   @behaviour Yex.Sync.SharedDoc.PersistenceBehaviour
#   alias Solidyjs.DocHandler
#   require Logger

#   @impl true
#   def bind(_state, :ydoc, new_doc) do
#     Logger.debug("Call Bind Yjs document to persistence")
#     sql3_current_doc = DocHandler.get_y_doc() |> dbg()
#     {:ok, new_updates} = Yex.encode_state_as_update(new_doc) |> dbg()
#     :done = DocHandler.update_doc(new_updates) |> dbg()
#     Yex.apply_update(new_doc, Yex.encode_state_as_update(sql3_current_doc)) |> dbg()
#   end

#   @impl true
#   def unbind(_state, _doc_name, _doc) do
#   end

#   @impl true
#   def update_v1(_state, update, :ydoc, _doc) do
#     DocHandler.update_doc(update)
#   end
# end
