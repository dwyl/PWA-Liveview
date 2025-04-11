defmodule Airports do
  require Logger

  def url do
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
  end

  def stream_download(path) do
    Logger.info("Starting airports database download...")

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

  def parse_csv_file(path) do
    path
    |> File.stream!(read_ahead: 1000)
    |> Stream.map(&String.trim/1)
    |> Stream.reject(&(&1 == ""))
    |> Stream.map(fn line ->
      # Parse CSV line handling quoted fields and commas
      # fields = parse_csv_line(line)

      case parse_csv_line(line) do
        fields when length(fields) >= 13 ->
          [_ | headers] = Airport.schema_headers()
          # Process fields according to CSV format:
          # 1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports
          values =
            [
              # airport_id - preserve as string to handle both integer and text IDs
              get_field(fields, 0),
              # name (text not null) - Full airport name
              get_field(fields, 1),
              # city (text not null) - City name
              get_field(fields, 2),
              # country (text not null)
              get_field(fields, 3),
              # iata (text not null) - 3-letter IATA code
              get_field(fields, 4),
              # icao (text not null) - 4-letter ICAO code
              get_field(fields, 5),
              # latitude (real not null)
              get_field(fields, 6),
              # longitude (real not null)
              get_field(fields, 7),
              # altitude (integer not null) - In feet
              get_field(fields, 8),
              # timezone (float not null) - Hours offset from UTC
              get_field(fields, 9),
              # dst (text not null)
              get_field(fields, 10),
              # tz (text not null)
              get_field(fields, 11),
              # type (text not null)
              get_field(fields, 12),
              # source (text not null)
              get_field(fields, 13)
            ]
            |> dbg()

          # Return a map with the values
          headers
          |> Enum.zip(values)
          |> Map.new()
          |> dbg()

        _ ->
          # Return empty map for invalid rows
          %{}
      end
    end)
    |> Stream.reject(&(&1 == %{}))
  end

  # Parse a CSV line handling quoted fields and commas
  def parse_csv_line(line) do
    line
    |> String.trim()
    |> parse_csv_fields([], "", false)
  end

  # Parse CSV fields recursively
  defp parse_csv_fields("", fields, current, _in_quotes) do
    # Convert \N and empty strings to nil, trim quotes, and reverse the fields
    fields = [current | fields]
    # [current | fields]
    fields
    |> Enum.reverse()
    |> Enum.map(fn field ->
      case field do
        "\\N" ->
          nil

        "" ->
          nil

        field ->
          field = String.trim(field, "\"")
          if field == "", do: nil, else: field
      end
    end)
  end

  # Handle escaped quotes inside quoted fields
  defp parse_csv_fields(<<?\"::utf8, ?\"::utf8, rest::binary>>, fields, current, true) do
    parse_csv_fields(rest, fields, current <> "\"", true)
  end

  # Handle quote start/end
  defp parse_csv_fields(<<?\"::utf8, rest::binary>>, fields, current, in_quotes) do
    parse_csv_fields(rest, fields, current, !in_quotes)
  end

  # Handle commas inside quotes
  defp parse_csv_fields(<<?\,::utf8, rest::binary>>, fields, current, true) do
    parse_csv_fields(rest, fields, current <> ",", true)
  end

  # Handle field separators (commas)
  defp parse_csv_fields(<<?\,::utf8, rest::binary>>, fields, current, false) do
    parse_csv_fields(rest, [current | fields], "", false)
  end

  # Handle all other characters
  defp parse_csv_fields(<<char::utf8, rest::binary>>, fields, current, in_quotes) do
    parse_csv_fields(rest, fields, current <> <<char::utf8>>, in_quotes)
  end

  # Get field value from CSV fields list with index
  defp get_field(fields, index) do
    Enum.at(fields, index)
  end
end
