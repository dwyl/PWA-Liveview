# defmodule AirportsBis do
#   NimbleCSV.define(ParseCSV2, separator: ",")

#   alias Phoenix.PubSub
#   require Logger

#   def url do
#     "https://pkgstore.datahub.io/core/airport-codes/airport-codes_csv/data/e07739e49300d125989ee543d5598c4b/airport-codes_csv.csv"
#   end

#   def path do
#     Path.join([:code.priv_dir(:solidyjs), "static", "airports.csv"])
#   end

#   def download() do
#     file_pid =
#       File.open!(path(), [:write, :binary])

#     [size] =
#       Map.get(Req.head!(url: url()).headers, "content-length", ["0"])

#     size =
#       String.to_integer(size)

#     Logger.info("Downloading...........: #{size}b")

#     :ets.insert(:previous, {:v, 0})

#     func =
#       fn {:data, data}, {req, res} ->
#         IO.binwrite(file_pid, data)
#         chunk_size = byte_size(data)
#         res = Req.Response.update_private(res, :downloaded_chunks, chunk_size, &(&1 + chunk_size))

#         progress =
#           (res.private.downloaded_chunks * 100 / size) |> Float.round(1)

#         [v: v] = :ets.lookup(:previous, :v)

#         prev_progress =
#           (v * 100 / size)
#           |> Float.round(1)

#         if progress - prev_progress > 5 do
#           dbg({progress, prev_progress})
#           :ets.insert(:previous, {:v, res.private.downloaded_chunks})

#           :ok =
#             PubSub.broadcast(
#               :pubsub,
#               "download_progress",
#               {:downloading, %{progress: progress}}
#             )
#         end

#         if progress == 100 do
#           :ok =
#             PubSub.broadcast(
#               :pubsub,
#               "download_progress",
#               {:downloading, %{progress: progress}}
#             )
#         end

#         {:cont, {req, res}}
#       end

#     Req.get!(url: url(), raw: true, into: func)
#     File.close(file_pid)
#   end

#   # transform %{"coordinates" => "-74.93360137939453, 40.07080078125"} into
#   #  %{"lat" => -74.93360137939453, "long" => 40.07080078125}
#   def parse_csv_file() do
#     headers = csv_string_headers()

#     path()
#     |> File.stream!(read_ahead: 2000)
#     |> ParseCSV.parse_stream(skip_header: true)
#     |> Stream.map(&Map.new(Enum.zip(headers, &1)))
#     |> Stream.map(fn map ->
#       values =
#         Map.get(map, "coordinates")
#         |> String.split(",")
#         |> Enum.map(&String.trim/1)
#         |> Enum.map(fn st -> Float.parse(st) |> elem(0) end)

#       Stream.zip(["lat", "long"], values)
#       |> Map.new()
#       |> Map.merge(map)
#       |> Airport.to_map()
#     end)
#   end

#   # !! select queries in SQLite are limited to 2000 substitutions ("?")
#   def insert_airports_into_db(parsed_file_stream) do
#     parsed_file_stream
#     |> Stream.chunk_every(1000)
#     |> Enum.map(&Solidyjs.Repo.insert_all(Airport, &1))
#   end

#   # def select_municipalities() do
#   #   Ecto.Adapters.SQL.query(
#   #     Solidyjs.Repo,
#   #     "select a.municipality, a.lat, a.long from airports as a"
#   #   )
#   # end

#   defp csv_string_headers do
#     # ~w(ident type name elevation_ft continent iso_country iso_region municipality gps_code iata_code local_code coordinates)
#     path()
#     |> File.stream!(:line)
#     |> Enum.take(1)
#     |> hd()
#     |> String.split(",")
#     |> Enum.map(&String.trim/1)

#     #
#   end
# end
