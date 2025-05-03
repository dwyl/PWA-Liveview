defmodule Airports do
  require Logger

  @moduledoc """
  - This module is responsible for downloading and parsing the airports CSV file.

  - It defines a function `stream_and_parse_airports_csv/0` that streams the CSV file
    from a URL and parses it into a list of rows.

  - The CSV file is expected to be in the format:
    1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports

  - The function `stream_download/0` is a debug function to download the CSV file
    and save it to a local file.
  """

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

  # No data in chunk, return leftover
  defp parse_chunk("", leftover) do
    {[], leftover}
  end

  defp parse_chunk(chunk, leftover) do
    # "leftover"partial lines between chunks
    full = leftover <> chunk

    case String.split(full, "\n") do
      # No newline found
      [line] ->
        {[], line}

      # Found exactly one newline, most common case
      [complete, rest] ->
        {CSVParser.parse_string(complete), rest}

      # Multiple newlines
      [first | rest] ->
        last = List.last(rest)
        complete = [first | Enum.take(rest, length(rest) - 1)]
        {CSVParser.parse_string(Enum.join(complete, "\n")), last}
    end
  end

  # debug function to check the CSV file
  def stream_download do
    Logger.info("Starting airports database download into a file...")
    path = "./priv/static/airports.csv"

    func = fn {:data, data}, {req, resp} ->
      :ok = File.write!(path, data, [:append])
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
      err ->
        Logger.error("Failed to download airports data: #{inspect(err)}")
        raise "Failed to write airports data to file"
    end
  end
end
