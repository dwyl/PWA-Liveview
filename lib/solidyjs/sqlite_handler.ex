defmodule SqliteHandler do
  use GenServer, restart: :transient
  alias Exqlite.Sqlite3
  require Logger

  # Parse float from string or float
  defp parse_float(value) when is_float(value), do: value

  defp parse_float(value) when is_binary(value) do
    case Float.parse(value) do
      {num, _} -> num
      :error -> 0.0
    end
  end

  # Parse integer from string, float, or integer
  defp parse_integer(value) when is_integer(value), do: value
  defp parse_integer(value) when is_float(value), do: trunc(value)

  defp parse_integer(value) when is_binary(value) do
    case Float.parse(value) do
      {num, _} -> trunc(num)
      :error -> 0
    end
  end

  def start_link([db, name]) do
    GenServer.start_link(__MODULE__, [db, name], name: __MODULE__)
  end

  @impl true
  def init([db, name]) do
    db_dir = Path.dirname(db)
    File.mkdir_p!(db_dir)

    Logger.info("Starting DB #{inspect(db)}")

    # Ensure the database file exists and has correct permissions
    if !File.exists?(db) do
      File.touch!(db)
      File.chmod!(db, 0o666)
    end

    # Ensure no existing connections

    case Sqlite3.open(db, mode: :readwrite) do
      {:ok, conn} ->
        # Set pragmas for better performance and reliability
        # Set busy timeout to 5000ms
        Sqlite3.execute(conn, "PRAGMA busy_timeout = 5000")
        # Use WAL mode for better concurrency
        Sqlite3.execute(conn, "PRAGMA journal_mode = WAL")
        # Sqlite3.execute(conn, "PRAGMA journal_mode = DELETE")
        Sqlite3.execute(conn, "PRAGMA synchronous = OFF")
        Sqlite3.execute(conn, "PRAGMA temp_store = MEMORY")

        # Only create table if it doesn't exist
        create_table(conn, name)
        {:ok, {db, name, conn}, {:continue, :check_data}}

      {:error, reason} ->
        Logger.warning("Failed to open db: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  @impl true
  def handle_continue(:check_data, {_db, name, conn} = state) do
    # Always ensure CSV file exists first
    csv_path = Path.join([:code.priv_dir(:solidyjs), "static", "airports.csv"])

    if !File.exists?(csv_path) do
      Logger.info("CSV file not found, downloading...")

      Airports.download()
    end

    # Check if we have data in the table
    case Sqlite3.prepare(conn, "SELECT COUNT(*) FROM #{name}") do
      {:ok, stmt} ->
        run_step(state, stmt)

      {:error, reason} ->
        Logger.error("Failed to check table data: #{inspect(reason)}")
        {:stop, reason}
    end
  end

  def run_step({_db, _name, conn} = state, stmt) do
    case Sqlite3.step(conn, stmt) do
      {:row, [count]} when count > 0 ->
        Logger.info("Found #{count} existing rows in database")
        {:noreply, state}

      _ ->
        Logger.info("No data found, initializing database")

        case Airports.parse_csv_file()
             |> insert(state) do
          :ok ->
            {:noreply, state}

          {:error, reason} ->
            Sqlite3.close(conn)
            {:stop, reason}
        end
    end
  end

  def create_table(conn, table) do
    # Create table if it doesn't exist
    :ok =
      Sqlite3.execute(
        conn,
        # Table schema matching CSV format:
        # 1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports
        "CREATE TABLE IF NOT EXISTS #{table} (
        id integer primary key autoincrement,
        airport_id text not null,              /* ID from source data (can be integer or text) */
        name text not null default '',         /* Full airport name */
        city text not null default '',         /* Main city served */
        country text not null default '',      /* Country or territory */
        iata text not null default '',         /* 3-letter IATA code */
        icao text not null default '',         /* 4-letter ICAO code */
        latitude real not null default 0.0,    /* Decimal degrees, usually 6 significant digits */
        longitude real not null default 0.0,   /* Decimal degrees, usually 6 significant digits */
        altitude integer not null default 0,    /* In feet */
        timezone real not null default 0.0,   /* Hours offset from UTC as float */
        dst text not null default '',          /* Daylight savings time code (E/A/S/O/Z/N/U) */
        tz text not null default '',           /* Timezone in Olson format */
        type text not null default '',         /* Type of airport */
        source text not null default ''        /* Source of this data */
        )"
      )
  end

  def reset_table(conn, table) do
    Logger.info("Reset DB")
    :ok = Sqlite3.execute(conn, "DROP TABLE IF EXISTS #{table}")
    :ok = create_table(conn, table)
  end

  def municipalities do
    GenServer.call(__MODULE__, :municipalities)
  end

  @impl true
  def terminate(_reason, {_db, _name, conn}) do
    Sqlite3.close(conn)
  end

  defp create_value_placeholders(num_rows) do
    Enum.map_join(1..num_rows, ",", fn i ->
      offset = (i - 1) * 14
      params = Enum.map(1..14, fn j -> "?#{offset + j}" end)
      "(#{Enum.join(params, ", ")})"
    end)
  end

  defp build_insert_query(table_name, values_placeholder) do
    columns = [
      "airport_id",
      "name",
      "city",
      "country",
      "iata",
      "icao",
      "latitude",
      "longitude",
      "altitude",
      "timezone",
      "dst",
      "tz",
      "type",
      "source"
    ]

    "INSERT INTO #{table_name} (#{Enum.join(columns, ",")}) VALUES #{values_placeholder}"
  end

  defp get_text_field(row, field, default \\ ""), do: row[field] || default
  defp get_float_field(row, field), do: row[field] || "0.0"
  defp get_integer_field(row, field), do: row[field] || "0"

  defp extract_row_values(row) do
    [
      get_integer_field(row, :airport_id),
      get_text_field(row, :name),
      get_text_field(row, :city),
      get_text_field(row, :country),
      get_text_field(row, :iata),
      get_text_field(row, :icao),
      get_float_field(row, :latitude),
      get_float_field(row, :longitude),
      get_integer_field(row, :altitude),
      get_integer_field(row, :timezone),
      get_text_field(row, :dst),
      get_text_field(row, :tz),
      get_text_field(row, :type),
      get_text_field(row, :source)
    ]
  end

  defp execute_batch_insert(conn, query, values) do
    with {:ok, stmt} <- Sqlite3.prepare(conn, query),
         :ok <- Sqlite3.bind(stmt, values),
         :ok <- Sqlite3.execute(conn, "BEGIN IMMEDIATE"),
         :done <- Sqlite3.step(conn, stmt),
         :ok <- Sqlite3.release(conn, stmt),
         :ok <- Sqlite3.execute(conn, "COMMIT") do
      :ok
    else
      {:error, reason} ->
        handle_insert_error(conn, {:sqlite_error, reason})
        # error -> handle_insert_error(conn, error)
    end
  end

  def insert(rows_stream, {_db, name, conn}) do
    try do
      # Process in chunks of 2000 rows and track total
      # SQLite has 32,766 capacity / 14 parameters => ~2300 rows max per chunk so 2000 is safe
      total =
        rows_stream
        |> Stream.chunk_every(2000)
        |> Stream.map(fn rows ->
          values_placeholder = create_value_placeholders(length(rows))
          query = build_insert_query(name, values_placeholder)
          values = Enum.flat_map(rows, &extract_row_values/1)

          case execute_batch_insert(conn, query, values) do
            :error ->
              :error

            :ok ->
              count = length(rows)
              Logger.info("Bulk inserted #{count} rows")
              count
          end
        end)
        |> Enum.sum()

      Logger.info("Total rows inserted: #{total}")
      :ok
    catch
      error ->
        Logger.error("Bulk insert failed: #{inspect(error)}")
        {:error, error}
    end
  end

  defp handle_insert_error(conn, error) do
    Logger.error(inspect(error))
    Sqlite3.execute(conn, "ROLLBACK")
    :error
  end

  def get_municipalities(conn, stmt, data \\ []) do
    results =
      case Exqlite.Sqlite3.step(conn, stmt) do
        {:row, d} ->
          get_municipalities(conn, stmt, [d | data])

        :done ->
          data
      end

    :ok = Exqlite.Sqlite3.release(conn, stmt)
    results
  end

  @impl true
  def handle_call(:municipalities, _, {_db, table, conn} = state) do
    # Simple query that searches both name and city
    {:ok, stmt} =
      Sqlite3.prepare(
        conn,
        """
        SELECT
          airport_id,         -- Unique identifier
          name,              -- Airport name (what users search for)
          city,              -- City name
          country,           -- Country name
          iata,              -- IATA code
          icao,              -- ICAO code
          latitude,          -- Latitude (float)
          longitude,         -- Longitude (float)
          altitude,          -- Altitude (integer)
          timezone,          -- Timezone offset
          dst,               -- Daylight savings code
          tz,                -- Timezone name
          type,              -- Type of airport
          source             -- Data source
        FROM #{table}
        """
      )

    # No binding needed since we're loading all airports

    data =
      get_municipalities(conn, stmt)
      |> Enum.map(&format_line/1)

    {:reply, data, state}
  end

  defp format_line(line) do
    [
      airport_id,
      name,
      city,
      country,
      iata,
      icao,
      latitude,
      longitude,
      altitude,
      timezone,
      dst,
      tz,
      type,
      source
    ] = line

    # Map fields according to CSV format:
    # 1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports
    %{
      # ID from source data (preserve as string)
      airport_id: parse_string(airport_id),
      # Full airport name
      name: parse_string(name),
      # Main city served
      city: parse_string(city),
      # Country or territory
      country: parse_string(country),
      # 3-letter IATA code
      iata: parse_string(iata),
      # 4-letter ICAO code
      icao: parse_string(icao),
      # Decimal degrees, usually 6 significant digits
      latitude: if(is_nil(latitude), do: 0.0, else: parse_float(latitude)),
      # Decimal degrees, usually 6 significant digits
      longitude: if(is_nil(longitude), do: 0.0, else: parse_float(longitude)),
      # In feet (integer)
      altitude: if(is_nil(altitude), do: 0, else: parse_integer(altitude)),
      # Hours offset from UTC
      timezone: if(is_nil(timezone), do: 0.0, else: parse_float(timezone)),
      # Daylight savings time
      dst: parse_string(dst),
      # Timezone in Olson format
      tz: parse_string(tz),
      # Type of airport
      type: parse_string(type),
      # Source of this data
      source: parse_string(source)
    }
  end

  defp parse_string(value) do
    if is_nil(value) do
      ""
    else
      value
    end
  end
end
