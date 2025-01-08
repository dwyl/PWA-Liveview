defmodule SqliteHandler do
  use GenServer, restart: :transient
  alias Exqlite.Sqlite3

  def start_link([db, name]) do
    GenServer.start_link(__MODULE__, [db, name], name: __MODULE__)
  end

  @impl true
  def init([db, name]) do
    case Sqlite3.open(db, mode: :readwrite) do
      {:ok, conn} ->
        Sqlite3.execute(conn, "PRAGMA journal_mode = WAL;")
        reset_table(conn, name)
        create_table(conn, name)
        Sqlite3.close(conn)
        {:ok, {db, name}, {:continue, :set_airports}}

      {:error, reason} ->
        {:stop, reason}
    end
  end

  @impl true
  def handle_continue(:set_airports, {db, _name} = state) do
    csv_exists? =
      Path.join([:code.priv_dir(:solidyjs), "static", "airports.csv"]) |> File.exists?()

    dbg(csv_exists?)

    if !csv_exists? do
      Airports.download()
    end

    case Sqlite3.open(db, mode: :readwrite) do
      {:ok, conn} ->
        case Airports.parse_csv_file()
             |> insert(state) do
          :ok ->
            Sqlite3.close(conn)
            {:noreply, state}

          {:error, reason} ->
            {:stop, reason}
        end
    end
  end

  def create_table(conn, table) do
    :ok = Sqlite3.execute(conn, "DROP TABLE IF EXISTS #{table}")

    :ok =
      Sqlite3.execute(
        conn,
        "CREATE TABLE IF NOT EXISTS #{table} (
        id integer,
        name text,
        city text,
        country text,
        iata text,
        icao text,
        latitude real,
        longitude real,
        altitude integer,
        dst text,
        tz text,
        type text,
        source text
        )"
      )
  end

  def reset_table(conn, table) do
    :ok = Sqlite3.execute(conn, "DROP TABLE IF EXISTS #{table}")
    :ok = create_table(conn, table)
  end

  def municipalities do
    GenServer.call(__MODULE__, :municipalities)
  end

  def insert(rows, {db, name}) do
    case Sqlite3.open(db, mode: :readwrite) do
      {:ok, conn} ->
        :ok =
          Enum.each(rows, fn row ->
            {:ok, stmt} =
              Sqlite3.prepare(conn, "INSERT INTO #{name} (
                name,
                city,
                country,
                iata,
                icao,
                latitude,
                longitude,
                altitude,
                dst,
                tz,
                type,
                source)
              VALUES
                (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)
              ")

            :ok =
              Sqlite3.bind(stmt, [
                row.name,
                row.city,
                row.country,
                row.iata,
                row.icao,
                row.latitude,
                row.longitude,
                row.altitude,
                row.dst,
                row.tz,
                row.type,
                row.source
              ])

            :ok = Sqlite3.execute(conn, "BEGIN TRANSACTION")
            :done = Sqlite3.step(conn, stmt)
            :ok = Sqlite3.execute(conn, "END TRANSACTION")
          end)

      {:error, reason} ->
        {:error, reason}
    end
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
  def handle_call(:municipalities, _, {db, table} = state) do
    case Sqlite3.open(db, mode: :readonly) do
      {:ok, conn} ->
        {:ok, stmt} = Sqlite3.prepare(conn, "SELECT city,latitude,longitude FROM #{table}")

        data =
          get_municipalities(conn, stmt)
          |> Enum.map(fn [city, latitude, longitude] ->
            %{city: city, latitude: latitude, longitude: longitude}
            # Map.put(%{}, city, %{"latitude" => latitude, "longitude" => longitude})
          end)

        :ok = Sqlite3.close(conn)

        {:reply, data, state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end
end
