defmodule AirportDB do
  use GenServer, restart: :transient
  alias Exqlite.Sqlite3
  require Logger

  @moduledoc """
  This module is responsible for managing the SQLite database connection
  and ensuring that the airports data is loaded into the database.
  It handles the initialization of the database, including setting up
  the necessary tables and inserting data from a CSV file.
  """

  ### Public API
  def start_link([db]) do
    GenServer.start_link(__MODULE__, [db], name: __MODULE__)
  end

  ### Callbacks
  @impl true
  def init([db]) do
    # Ensure the database file exists and has correct permissions
    if File.exists?(db) do
      Logger.info("Database ready")
      {:ok, ""}
    else
      Logger.info("Creating database")
      File.touch!(db)
      File.chmod!(db, 0o666)
    end

    # Ensure no existing connections & run migrations
    with {:ok, conn} <-
           Sqlite3.open(db, mode: :readwrite),

         # Set pragmas for better performance and reliability
         # Set busy timeout to 5000ms
         :ok <-
           Sqlite3.execute(conn, "PRAGMA busy_timeout = 5000"),
         # Use WAL mode for better concurrency
         :ok <-
           Sqlite3.execute(conn, "PRAGMA journal_mode = WAL"),
         # Sqlite3.execute(conn, "PRAGMA journal_mode = DELETE")
         :ok <-
           Sqlite3.execute(conn, "PRAGMA synchronous = OFF"),
         :ok <-
           Sqlite3.execute(conn, "PRAGMA temp_store = MEMORY") do
      #  [{:ok, _, _}] <-
      #    Solidyjs.Release.migrate() do
      state = {conn, db, "airports"}
      {:ok, state, {:continue, :get_airports}}
    else
      {:error, reason} ->
        Logger.error("Failed to open db: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  @impl true
  def handle_continue(:get_airports, state) do
    ### DEBUG: firstly download the file to check the CSV parsing
    # if !File.exists?(csv_path()) do
    # :ok = Airports.stream_download()
    # end

    {conn, _db, table_name} = state

    sql = "SELECT COUNT(*) FROM #{table_name};"

    with {:ok, stmt} <- Sqlite3.prepare(conn, sql),
         {:row, [count]} <- Sqlite3.step(conn, stmt),
         0 <- count,
         :ok <- insert_bulk(state) do
      {:noreply, state}
    else
      {:error, reason} ->
        Logger.error("Failed to prepare statement: #{inspect(reason)}")
        {:stop, reason}

      count ->
        Logger.info("Found #{count} existing rows in database")
        {:noreply, state}
    end
  end

  defp insert_bulk(state) do
    {conn, _db, _table_name} = state

    with {:ok, rows} <-
           Airports.stream_and_parse_airports_csv(),
         :ok <-
           Sqlite3.execute(conn, "BEGIN IMMEDIATE TRANSACTION"),
         {:ok, stmt} <-
           prepare_insert_statement(conn),
         :ok <-
           run_step(conn, stmt, rows),
         :ok <-
           Sqlite3.release(conn, stmt),
         :ok <-
           Sqlite3.execute(conn, "COMMIT") do
      Logger.info("Finished inserting #{length(rows)} rows.")
    else
      reason ->
        Sqlite3.execute(conn, "ROLLBACK")
        Logger.error("Failed to insert airports: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp prepare_insert_statement(conn) do
    sql = """
    INSERT INTO airports (airport_id, name, city, country, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?);
    """

    Sqlite3.prepare(conn, sql)
  end

  defp run_step(conn, stmt, rows) do
    Enum.reduce_while(rows, :ok, fn row, _acc ->
      with :ok <-
             Sqlite3.bind(stmt, row),
           :done <-
             Sqlite3.step(conn, stmt),
           :ok <-
             Sqlite3.reset(stmt) do
        {:cont, :ok}
      else
        error ->
          {:halt, error}
      end
    end)
  end
end
