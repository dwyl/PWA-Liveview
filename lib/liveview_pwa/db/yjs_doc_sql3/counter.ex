defmodule LiveviewPwa.Counter do
  use GenServer
  alias Exqlite.Sqlite3
  require Logger

  @moduledoc """
  A GenServer interface to handle synchronous calls to save
  and retrieve a single counter value in a SQLite database,
  ensuring that the state is persisted across application restarts.

  The table is named "counter_state" with a single row:
    - id: always "counter"
    - counter: integer value

  Uses Exqlite for DB access.
  """

  ## Public API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec get_counter() :: {:ok, integer()} | {:error, any()}
  def get_counter do
    GenServer.call(__MODULE__, :get_counter)
  end

  @spec set_counter(integer()) :: :ok | {:error, any()}
  def set_counter(new_value) do
    GenServer.call(__MODULE__, {:set_counter, new_value})
  end

  ## GenServer callbacks

  @impl true
  def init([db]) do
    with {:ok, conn} <- Sqlite3.open(db),
         :ok <- Sqlite3.execute(conn, "PRAGMA busy_timeout = 5000"),
         :ok <- Sqlite3.execute(conn, "PRAGMA journal_mode = WAL"),
         :ok <- Sqlite3.execute(conn, "PRAGMA synchronous = NORMAL") do
      #  :ok <- maybe_init_table(conn, max) do
      state = %{conn: conn, db: db, name: "counter_state", cached: nil}
      {:ok, state}
    else
      msg ->
        Logger.error("Failed to open database: #{inspect(msg)}")
        {:stop, msg}
    end
  end

  @impl true
  def handle_call(:get_counter, _from, %{cached: nil} = state) do
    %{conn: conn, name: name} = state

    case get_current_counter(conn, name) do
      {:ok, counter} ->
        {:reply, {:ok, counter}, %{state | cached: counter}}

      {:error, _} = err ->
        {:reply, err, state}
    end
  end

  def handle_call(:get_counter, _from, %{cached: cached} = state) when not is_nil(cached) do
    {:reply, {:ok, cached}, state}
  end

  @impl true
  def handle_call({:set_counter, new_value}, _from, state) do
    %{conn: conn, name: name} = state
    sql = "UPDATE #{name} SET counter = (?1) WHERE id = 'counter'"

    with :ok <- Sqlite3.execute(conn, "BEGIN IMMEDIATE TRANSACTION"),
         {:ok, stmt} <- Sqlite3.prepare(conn, sql),
         :ok <- Sqlite3.bind(stmt, [new_value]),
         :done <- Sqlite3.step(conn, stmt),
         :ok <- Sqlite3.release(conn, stmt),
         :ok <- Sqlite3.execute(conn, "COMMIT") do
      Logger.debug("Updated counter to #{new_value}")
      {:reply, :ok, %{state | cached: new_value}}
    else
      msg ->
        Logger.error("Failed to update counter: #{inspect(msg)}")
        :ok = Sqlite3.execute(conn, "ROLLBACK")
        {:reply, :error, state}
    end
  end

  # Table init logic
  # defp maybe_init_table(conn, max) do
  #   :ok =
  #     Sqlite3.execute(conn, """
  #     CREATE TABLE IF NOT EXISTS counter_state (
  #       id TEXT PRIMARY KEY,
  #       counter INTEGER NOT NULL
  #     );
  #     """)

  #   # Insert initial row if not exists
  #   sql = "INSERT OR IGNORE INTO counter_state (id, counter) VALUES ('counter', ?1)"
  #   {:ok, stmt} = Sqlite3.prepare(conn, sql)
  #   :ok = Sqlite3.bind(stmt, [max])
  #   :done = Sqlite3.step(conn, stmt)
  #   :ok = Sqlite3.release(conn, stmt)
  #   :ok
  # end

  defp get_current_counter(conn, name) do
    sql = "SELECT counter FROM #{name} WHERE id = 'counter'"

    with {:ok, stmt} <- Sqlite3.prepare(conn, sql),
         {:row, [counter]} <- Sqlite3.step(conn, stmt),
         :ok <- Sqlite3.release(conn, stmt) do
      {:ok, counter}
    else
      err ->
        Logger.error("Failed to fetch counter: #{inspect(err)}")
        {:error, nil}
    end
  end

  @impl true
  def terminate(_reason, state) do
    Sqlite3.close(state.conn)
  end
end
