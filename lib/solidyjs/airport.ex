defmodule Airport do
  use Ecto.Schema

  @headers [
    :name,
    :city,
    :country,
    :iata,
    :icao,
    :latitude,
    :longitude,
    :altitude,
    :dst,
    :tz,
    :type,
    :source
  ]

  schema "airports" do
    Enum.each(@headers, fn field ->
      if field in [:latitude, :longitude] do
        field(field, :float)
      else
        field(field, :string)
      end
    end)
  end

  def schema_headers() do
    Airport.__schema__(:fields)
  end

  # ExSqlite needs convert "string" -> :string
  # def to_map(row) do
  #   %{
  #     # "airport_id" => airport_id,
  #     "name" => name,
  #     "city" => city,
  #     "country" => country,
  #     "iata" => iata,
  #     "icao" => icao,
  #     "latitude" => latitude,
  #     "longitude" => longitude,
  #     "altitude" => altitude,
  #     "dst" => dst,
  #     "tz" => tz,
  #     "type" => type,
  #     "source " => source
  #   } = row

  #   %{
  #     # airport_id: airport_id |> String.to_integer(),
  #     name: name,
  #     city: city,
  #     country: country,
  #     iata: iata,
  #     icao: icao,
  #     latitude: latitude,
  #     longitude: longitude,
  #     altitude: altitude,
  #     dst: dst,
  #     tz: tz,
  #     type: type,
  #     source: source
  #   }
  # end
end
