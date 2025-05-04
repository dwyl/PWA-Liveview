defmodule Solidyjs.DocHandler do
  use GenServer
  alias Exqlite.Sqlite3
  require Logger

  @moduledoc """
  A GenServer interface to handle synchronous calls to save
  and retrieve the `Yjs` document state in a `SQLite` database,
  ensuring that the state is persisted across application restarts.

  The database is opened with a busy timeout of 5000ms, and the
  journal mode is set to WAL (Write-Ahead Logging) for better
  concurrency. The synchronous mode is set to NORMAL for better
  performance.

  The module uses the `Exqlite` library to interact with the `SQLite`
  database.

  The table named "yjs-state" with a single row containing the Yjs document state.

  The id of the row should be "yjs-state", and the state should
  be a binary representation of the Yjs document state.
  """

  ### Public API
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def update_doc(new_doc) do
    Logger.debug("Updating Yjs document in database")
    GenServer.call(__MODULE__, {:update_doc, new_doc})
  end

  def get_y_doc do
    Logger.debug("Fetching Yjs document from database")
    GenServer.call(__MODULE__, :get_y_doc)
  end

  ##################################################################
  # GenServer callbacks
  ##################################################################
  @impl true
  def init([db, max]) do
    # Set pragmas for better performance
    with true <- File.exists?(db),
         {:ok, conn} <- Sqlite3.open(db),
         :ok <- Sqlite3.execute(conn, "PRAGMA busy_timeout = 5000"),
         :ok <- Sqlite3.execute(conn, "PRAGMA journal_mode = WAL"),
         :ok <- Sqlite3.execute(conn, "PRAGMA synchronous = NORMAL") do
      state = %{conn: conn, db: db, name: "yjs_documents", max: max}
      {:ok, state}
    else
      msg ->
        Logger.error("Failed to open database: #{inspect(msg)}")
        {:stop, msg}
    end
  end

  @impl true
  def handle_call({:update_doc, new_doc}, _from, state) do
    %{conn: conn, name: name} = state

    sql = "UPDATE #{name} SET y_doc = (?1) WHERE id = 'yjs-doc'"

    with {:ok, statement} <-
           Sqlite3.prepare(conn, sql),
         :ok <-
           Sqlite3.bind(statement, [new_doc]),
         :done <-
           Sqlite3.step(conn, statement),
         :ok <-
           Sqlite3.release(conn, statement) do
      Logger.info("Updated yjs-doc")
      {:reply, :done, state}
    else
      msg ->
        Logger.error("Failed to update yjs-doc: #{inspect(msg)}")
        {:reply, :error, state}
    end
  end

  @impl true
  def handle_call(:get_y_doc, _from, state) do
    %{conn: conn, name: name} = state
    {:reply, get_current_y_doc(conn, name), state}
  end

  # the table is initialized with a single row containing the Yjs document state
  # with id = "yjs-state" and state = <<>>
  defp get_current_y_doc(conn, name) do
    sql = "SELECT y_doc FROM #{name} WHERE id = (?1)"

    with {:ok, stmt} <-
           Sqlite3.prepare(conn, sql),
         :ok <-
           Sqlite3.bind(stmt, ["yjs-doc"]),
         {:row, [current_doc]} <-
           Sqlite3.step(conn, stmt),
         :ok <-
           Sqlite3.release(conn, stmt) do
      {:ok, current_doc}
    else
      err ->
        Logger.error("Failed to fetch yjs-doc: #{inspect(err)}")
        {:error, <<>>}
    end
  end
end
