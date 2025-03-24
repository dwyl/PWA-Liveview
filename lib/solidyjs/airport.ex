defmodule Airport do
  use Ecto.Schema

  #

  @headers [
    # Airport ID from source data
    # 1,
    # :airport_id,
    # Name of airport
    # "Goroka Airport",
    :name,
    # City served by airport
    # "Goroka",
    :city,
    # Country or territory where airport is located
    # "Papua New Guinea",
    :country,
    # 3-letter IATA code
    # "GKA",
    :iata,
    # 4-letter ICAO code
    # "AYGA",
    :icao,
    # Decimal degrees, usually to six significant digits
    # -6.081689834590001,
    :latitude,
    # Decimal degrees, usually to six significant digits
    # 145.391998291,
    :longitude,
    # In feet
    # 5282,
    :altitude,
    # Hours offset from UTC
    # 0,
    :timezone,
    # Daylight savings time
    # "U",
    :dst,
    # Timezone in Olson format
    # "Pacific/Port_Moresby",
    :tz,
    # Type of the airport
    # "airport",
    :type,
    # Source of the data
    # "OurAirports"
    :source
  ]

  # Schema matching CSV format:
  # 1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports
  schema "airports" do
    Enum.each(@headers, fn field ->
      cond do
        # Lat/long/timezone are floats with decimal precision
        field in [:latitude, :longitude, :timezone] -> field(field, :float)
        # Altitude is integer (in feet)
        field == :altitude -> field(field, :integer)
        # All other fields are strings (including airport_id to handle both integer and text IDs)
        true -> field(field, :string)
      end
    end)
  end

  def schema_headers() do
    Airport.__schema__(:fields)
  end
end
