defmodule Airports do
  require Logger

  # Get field value from CSV fields list with index
  defp get_field(fields, index) do
    Enum.at(fields, index)
  end

  # Parse a CSV line handling quoted fields and commas
  defp parse_csv_line(line) do
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

  def url do
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
  end

  def path do
    Path.join([:code.priv_dir(:solidyjs), "static", "airports.csv"])
  end

  def download() do
    Logger.info("Starting airports database download...")

    try do
      # Ensure directory exists with proper permissions
      csv_dir = Path.dirname(path())
      File.mkdir_p!(csv_dir)

      # Download the data
      case Req.get(url()) do
        {:ok, response} ->
          # Validate response
          if response.status != 200 do
            raise "Failed to download airports data: HTTP #{response.status}"
          end

          # Process and write to file with proper permissions
          File.write!(path(), "")
          File.chmod!(path(), 0o666)

          # Download raw data and write directly to preserve format
          response.body
          |> String.split("\n")
          |> Stream.map(&String.trim/1)
          |> Stream.reject(&(&1 == ""))
          |> Stream.with_index(1)
          |> Stream.each(fn {line, index} ->
            File.write!(path(), line <> "\n", [:append])

            if rem(index, 1000) == 0 do
              Logger.info("Processed #{index} airports...")
            end
          end)
          |> Stream.run()

          # Verify file was written
          case File.stat(path()) do
            {:ok, %{size: size}} when size > 0 ->
              Logger.info("Airport database downloaded successfully. File size: #{size} bytes")
              :ok

            _ ->
              raise "Failed to write airports data to file"
          end

        {:error, reason} ->
          raise "Failed to download airports data: #{inspect(reason)}"
      end
    rescue
      e in RuntimeError ->
        Logger.error("Error downloading airports: #{Exception.message(e)}")
        {:error, e}

      e ->
        Logger.error("Unexpected error downloading airports: #{inspect(e)}")
        {:error, e}
    end
  end

  def parse_csv_file() do
    headers = Airport.schema_headers()

    path()
    |> File.stream!(read_ahead: 1000)
    |> Stream.map(&String.trim/1)
    |> Stream.reject(&(&1 == ""))
    |> Stream.map(fn line ->
      # Parse CSV line handling quoted fields and commas
      fields = parse_csv_line(line)

      case fields do
        fields when length(fields) >= 13 ->
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
              get_field(fields, 12)
              # source (text not null)
              # get_field(fields, 13)
            ]

          # Return a map with the values
          Enum.zip(headers, values) |> Map.new()

        _ ->
          # Return empty map for invalid rows
          %{}
      end
    end)
    |> Stream.reject(&(&1 == %{}))
  end
end
