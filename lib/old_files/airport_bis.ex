# defmodule AirportBis do
#   use Ecto.Schema

#   @headers [
#     :ident,
#     :elevation_ft,
#     :type,
#     :name,
#     :continent,
#     :iso_country,
#     :iso_region,
#     :municipality,
#     :iata_code,
#     :local_code,
#     :gps_code,
#     :coordinates,
#     :lat,
#     :long
#   ]

#   schema "airports" do
#     Enum.each(@headers, fn field ->
#       if field in [:lat, :long] do
#         field(field, :float)
#       else
#         field(field, :string)
#       end
#     end)
#   end

#   def schema_headers() do
#     Airport.__schema__(:fields)
#   end

#   # ExSqlite needs convert "string" -> :string

#   def to_map(row) do
#     %{
#       "name" => name,
#       "type" => type,
#       "long" => long,
#       "continent" => continent,
#       "coordinates" => coordinates,
#       "elevation_ft" => elevation_ft,
#       "gps_code" => gps_code,
#       "iata_code" => iata_code,
#       "ident" => ident,
#       "iso_country" => iso_country,
#       "iso_region" => iso_region,
#       "lat" => lat,
#       "local_code" => local_code,
#       "municipality" => municipality
#     } = row

#     %{
#       continent: continent,
#       coordinates: coordinates,
#       elevation_ft: elevation_ft,
#       gps_code: gps_code,
#       iata_code: iata_code,
#       ident: ident,
#       iso_country: iso_country,
#       iso_region: iso_region,
#       lat: lat,
#       local_code: local_code,
#       long: long,
#       municipality: municipality,
#       name: name,
#       type: type
#     }
#   end
# end
