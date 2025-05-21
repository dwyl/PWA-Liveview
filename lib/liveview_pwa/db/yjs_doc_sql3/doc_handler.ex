# defmodule LiveviewPwa.DocHandler do
#   use GenServer
#   alias Exqlite.Sqlite3
#   require Logger

#   @moduledoc """
#   A GenServer interface to handle synchronous calls to save
#   and retrieve the `Yjs` document state in a `SQLite` database,
#   ensuring that the state is persisted across application restarts.

#   The database is opened with a busy timeout of 5000ms, and the
#   journal mode is set to WAL (Write-Ahead Logging) for better
#   concurrency. The synchronous mode is set to NORMAL for better
#   performance.

#   The module uses the `Exqlite` library to interact with the `SQLite`
#   database.

#   The table named "yjs-state" with a single row containing the Yjs document state.

#   The id of the row should be "yjs-state", and the state should
#   be a binary representation of the Yjs document state.
#   """

#   ### Public API
#   def start_link(opts) do
#     GenServer.start_link(__MODULE__, opts, name: __MODULE__)
#   end

#   def update_doc(new_doc) do
#     Logger.debug("Updating Yjs document in database")
#     GenServer.call(__MODULE__, {:update_doc, new_doc})
#   end

#   def get_y_doc do
#     Logger.debug("Fetching Yjs document from database")
#     GenServer.call(__MODULE__, :get_y_doc)
#   end

#   ##################################################################
#   # GenServer callbacks
#   ##################################################################

#   # Note on PRAGAM settings:
#   # - The WAL journal mode provides a Write-Ahead Log provides more concurrency
#   # as readers do not block writers and a writer does not block readers,
#   # contrary to the default mode where readers block writers and vice versa.

#   # - When synchronous is NORMAL, the SQLite database engine will still sync
#   # at the most critical moments, but less often than in FULL mode.
#   # WAL mode is safe from corruption with synchronous=NORMAL".
#   #  It provides the best performance with the WAL mode.

#   @impl true
#   def init([db, max]) do
#     # Set pragmas for better performance
#     with true <- File.exists?(db),
#          {:ok, conn} <- Sqlite3.open(db),
#          :ok <- Sqlite3.execute(conn, "PRAGMA busy_timeout = 5000"),
#          :ok <- Sqlite3.execute(conn, "PRAGMA journal_mode = WAL"),
#          :ok <- Sqlite3.execute(conn, "PRAGMA synchronous = NORMAL") do
#       state = %{conn: conn, db: db, name: "yjs_documents", max: max, cached: nil}
#       {:ok, state}
#     else
#       msg ->
#         Logger.error("Failed to open database: #{inspect(msg)}")
#         {:stop, msg}
#     end
#   end

#   @impl true
#   def handle_call({:update_doc, new_doc}, _from, state) do
#     %{conn: conn, name: name} = state

#     sql = "UPDATE #{name} SET y_doc = (?1) WHERE id = 'yjs-doc'"

#     with :ok <-
#            Sqlite3.execute(conn, "BEGIN IMMEDIATE TRANSACTION"),
#          {:ok, stmt} <-
#            Sqlite3.prepare(conn, sql),
#          :ok <-
#            Sqlite3.bind(stmt, [new_doc]),
#          :done <-
#            Sqlite3.step(conn, stmt),
#          :ok <-
#            Sqlite3.release(conn, stmt),
#          :ok <-
#            Sqlite3.execute(conn, "COMMIT") do
#       Logger.debug("Updated yjs-doc")
#       {:reply, :done, %{state | cached: new_doc}}
#     else
#       msg ->
#         Logger.error("Failed to update yjs-doc: #{inspect(msg)}")
#         :ok = Sqlite3.execute(conn, "ROLLBACK")
#         {:reply, :error, state}
#     end
#   end

#   @impl true
#   # implement a cache read for YDoc as the update will save YDoc in state
#   # Cache miss
#   def handle_call(:get_y_doc, _from, %{cached: nil} = state) do
#     %{conn: conn, name: name} = state

#     case get_current_y_doc(conn, name) do
#       {:ok, cached} ->
#         state = %{state | cached: cached}
#         {:reply, {:ok, cached}, state}

#       {:error, <<>>} ->
#         Logger.error("Failed to fetch yjs-doc from database")
#         {:reply, {:error, <<>>}, state}
#     end
#   end

#   # Cache hit
#   def handle_call(:get_y_doc, _from, %{cached: cached} = state) when cached != nil do
#     {:reply, {:ok, cached}, state}
#   end

#   # the table is initialized with a single row containing the Yjs document state
#   # with id = "yjs-state" and state = <<>>
#   defp get_current_y_doc(conn, name) do
#     sql = "SELECT y_doc FROM #{name} WHERE id = (?1)"

#     with {:ok, stmt} <-
#            Sqlite3.prepare(conn, sql),
#          :ok <-
#            Sqlite3.bind(stmt, ["yjs-doc"]),
#          {:row, [current_doc]} <-
#            Sqlite3.step(conn, stmt),
#          :ok <-
#            Sqlite3.release(conn, stmt) do
#       {:ok, current_doc}
#     else
#       err ->
#         Logger.error("Failed to fetch yjs-doc: #{inspect(err)}")
#         {:error, <<>>}
#     end
#   end

#   @impl true
#   def terminate(_reason, state) do
#     Sqlite3.close(state.conn)
#   end
# end
