defmodule Airports do
  alias Exqlite.Sqlite3
  require Logger

  NimbleCSV.define(CSVParser, separator: ",", escape: "\"")

  def url do
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
  end

  def stream_and_parse_airports_csv do
    Logger.info("Starting airports CSV download and parse...")

    %Req.Response{private: %{csv: %{rows: rows}}} =
      Req.get!(
        url(),
        headers: %{"accept" => "text/csv"},
        into: fn {:data, chunk}, {req, resp} ->
          %{rows: rows, leftover: leftover} =
            Map.get(resp.private, :csv, %{rows: [], leftover: ""})

          {parsed_rows, new_leftover} = parse_chunk(chunk, leftover)

          new_resp =
            Req.Response.put_private(resp, :csv, %{
              rows: rows ++ parsed_rows,
              leftover: new_leftover
            })

          {:cont, {req, new_resp}}
        end
      )

    new_rows =
      Enum.map(rows, fn row ->
        [airport_id, name, city, country, _, _, lat, lon, _, _, _, _, _, _] = row
        [airport_id, name, city, country, lat, lon]
      end)

    Logger.info("Finished streaming. Parsed #{length(new_rows)} rows.")
    {:ok, new_rows}
  end

  defp parse_chunk(chunk, leftover) do
    # "leftover"partial lines between chunks
    full = leftover <> chunk

    case String.split(full, "\n", trim: false) do
      [] ->
        {[], ""}

      lines ->
        # Keep the last line as leftover (incomplete row)
        {complete, [rest]} = Enum.split(lines, -1)
        # parsed_rows = CSVParser.parse_string(Enum.join(complete, "\n"))
        parsed_rows =
          Enum.reject(complete, &(&1 == ""))
          |> Enum.join("\n")
          |> CSVParser.parse_string()

        {parsed_rows, rest}
    end
  end

  # debug function to check the CSV file
  def stream_download do
    Logger.info("Starting airports database download into a file...")
    path = url()

    func = fn {:data, data}, {req, resp} ->
      File.write!(path, data, [:append])
      {:cont, {req, resp}}
    end

    with {:ok, file} <-
           File.open(path, [:write, :binary]),
         #  :ok <-
         #    File.chmod(file, 0o666),
         {:ok, %{status: 200}} <-
           Req.get(url(), into: func, headers: %{"Accept" => "text/csv"}),
         :ok = File.close(file),
         {:ok, %{size: size}} <-
           File.stat(path) do
      Logger.info("Airport database downloaded successfully. File size: #{size} bytes")
    else
      {:error, reason} ->
        Logger.error("Failed to open file for writing: #{reason}")
        raise "Failed to open file for writing"

      err ->
        Logger.error("Failed to download airports data: #{inspect(err)}")
        raise "Failed to write airports data to file"
    end
  end

  @doc """
    Simple query that returns all airports from the database.
  """
  def municipalities do
    db = Application.get_env(:solidyjs, Solidyjs.Repo)[:database]
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
        Logger.error("Failed to open of fetch airports: #{inspect(reason)}")
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
