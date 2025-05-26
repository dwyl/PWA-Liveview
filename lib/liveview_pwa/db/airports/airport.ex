defmodule Airport do
  use Ecto.Schema
  alias Exqlite.Sqlite3
  require Logger

  @moduledoc """
  - define `schema` matching CSV format:
  1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports

  - getter `municipalities/0` returns all airports from the database.
  """

  # schema "airports" do
  #   field(:airport_id, :string)
  #   field(:name, :string)
  #   field(:city, :string)
  #   field(:country, :string)
  #   field(:latitude, :float)
  #   field(:longitude, :float)
  # end

  # def schema_headers do
  #   [:id | headers] = Airport.__schema__(:fields)
  #   headers
  # end

  defp db do
    # Application.get_env(:liveview_pwa, LiveviewPwa.Sql3Repo)[:database]
    LiveviewPwa.Sql3Repo.config()[:database]
  end

  def hash do
    db = db()
    query = "SELECT hash FROM airports LIMIT 1;"

    with {:ok, conn} <-
           Sqlite3.open(db),
         {:ok, stmt} <-
           Sqlite3.prepare(conn, query),
         {:row, [hash]} <-
           Sqlite3.step(conn, stmt),
         :done <-
           Sqlite3.step(conn, stmt),
         :ok <-
           Sqlite3.release(conn, stmt) do
      hash
    else
      reason ->
        Logger.error("Failed to open or fetch airports: #{inspect(reason)}")
        raise "Failed to open database connection"
    end
  end

  def put_hash(hash) do
    db = db()
    query = "UPDATE airports SET hash = ?1;"

    with {:ok, conn} <-
           Sqlite3.open(db),
         {:ok, stmt} <-
           Sqlite3.prepare(conn, query),
         :ok <-
           Sqlite3.bind(stmt, [hash]),
         :done <-
           Sqlite3.step(conn, stmt),
         :ok <-
           Sqlite3.release(conn, stmt) do
      :ok
    else
      reason ->
        Logger.error("Failed to open or fetch airports: #{inspect(reason)}")
        raise "Failed to open database connection"
    end
  end

  @doc """
    Simple query that returns all airports from the database.
  """
  def municipalities do
    Logger.info("[Airport] Fetching all from the database.............")
    db = db()
    query = "SELECT airport_id,name,city,country,latitude, longitude FROM airports;"

    with true <-
           File.exists?(db),
         {:ok, conn} <-
           Sqlite3.open(db),
         {:ok, stmt} <-
           Sqlite3.prepare(conn, query),
         {:ok, results} <-
           Sqlite3.fetch_all(conn, stmt),
         :ok <-
           Sqlite3.close(conn) do
      Enum.map(results, &format_line/1)
    else
      reason ->
        Logger.error("Failed to open or fetch airports: #{inspect(reason)}")
        raise "Failed to open database connection"
    end
  end

  defp format_line(line) do
    [
      airport_id,
      name,
      city,
      country,
      latitude,
      longitude
    ] = line

    %{
      airport_id: airport_id,
      name: name,
      city: city,
      country: country,
      latitude: parse_float(latitude),
      longitude: parse_float(longitude)
    }
  end

  defp parse_float(val) when is_float(val), do: val

  defp parse_float(val) when is_binary(val) do
    case Float.parse(val) do
      {num, _} -> num
      :error -> 0.0
    end
  end

  defp parse_float(val) when is_integer(val), do: val / 1.0
end
