defmodule Airports do
  NimbleCSV.define(ParseCSV, separator: ",")

  # alias Phoenix.PubSub
  require Logger

  def url do
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat"
  end

  def path do
    Path.join([:code.priv_dir(:solidyjs), "static", "airports.csv"])
  end

  def download() do
    # file_pid =
    #   File.open!(path(), [:write, :binary])

    Req.get!(url(), into: File.stream!(path()))
  end

  # def download() do
  #   file_pid =
  #     File.open!(path(), [:write, :binary])

  #   Map.get(Req.head!(url: url()).headers, "accept-ranges") |> dbg()

  #   [size] =
  #     Map.get(Req.head!(url: url()).headers, "content-length")

  #   size =
  #     String.to_integer(size) |> dbg()

  #   chunk = div(size, 10)

  #   Logger.info("Downloading...........: #{size} b")

  #   :ets.insert(:previous, {:v, 0})

  #   func =
  #     fn
  #       {:data, data}, {req, res} ->
  #         IO.binwrite(file_pid, data)
  #         chunk_size = byte_size(data) |> dbg()

  #         res =
  #           Req.Response.update_private(res, :downloaded_chunks, chunk_size, &(&1 + chunk_size))

  #         dbg(res.private.downloaded_chunks)

  #         progress = res.private.downloaded_chunks

  #         [v: prev_progress] = :ets.lookup(:previous, :v)

  #         cond do
  #           progress < size and progress - prev_progress > chunk ->
  #             dbg({progress, prev_progress})
  #             :ets.insert(:previous, {:v, res.private.downloaded_chunks})

  #             :ok =
  #               PubSub.broadcast(
  #                 :pubsub,
  #                 "download_progress",
  #                 {:downloading, %{progress: progress * 100 / size}}
  #               )

  #             {:cont, {req, res}}

  #           progress < size ->
  #             {:cont, {req, res}}

  #           progress >= size ->
  #             {:halt, {req, res}}
  #         end
  #     end

  #   Req.get!(url: url(), raw: true, into: func)
  #   File.close(file_pid)
  # end

  # transform %{"coordinates" => "-74.93360137939453, 40.07080078125"} into
  #  %{"lat" => -74.93360137939453, "long" => 40.07080078125}
  def parse_csv_file() do
    # headers = csv_string_headers()
    headers = Airport.schema_headers()

    path()
    |> File.stream!(read_ahead: 1000)
    |> ParseCSV.parse_stream(skip_header: true)
    |> Stream.map(&Map.new(Enum.zip(headers, &1)))

    # |> Stream.map(fn map ->
    #   values =
    #     Map.get(map, "coordinates")
    #     |> String.split(",")
    #     |> Enum.map(&String.trim/1)
    #     |> Enum.map(fn st -> Float.parse(st) |> elem(0) end)

    #   Stream.zip(["lat", "long"], values)
    #   |> Map.new()
    #   |> Map.merge(map)
    # |> Airport.to_map()
    # end)
  end

  # !! select queries in SQLite are limited to 2000 substitutions ("?")
  def insert_airports_into_db() do
    # parse_csv_file()
    # |> Enum.take(2)
    # |> Enum.map(fn row ->
    #   dbg(row)
    #   Airport.to_map(row) |> dbg()
    # end)
    # |> SqliteHandler.insert()

    # |> Stream.chunk_every(1000)
    # |> Stream.map(&Airport.to_map/1)

    # |> Enum.map(&Solidyjs.Repo.insert_all(Airport, &1))

    # |> Stream.map(fn rows ->
    # dbg(rows)
    # SqliteHandler.insert_all(rows)
    # rows
    # end)
  end

  # def select_municipalities() do
  #   Ecto.Adapters.SQL.query(
  #     Solidyjs.Repo,
  #     "select a.municipality, a.lat, a.long from airports as a"
  #   )
  # end

  # defp csv_string_headers do
  #   # ~w(ident type name elevation_ft continent iso_country iso_region municipality gps_code iata_code local_code coordinates)
  #   path()
  #   |> File.stream!(:line)
  #   |> Enum.take(1)
  #   |> hd()
  #   |> String.split(",")
  #   |> Enum.map(&String.trim/1)

  #   #
  # end
end
