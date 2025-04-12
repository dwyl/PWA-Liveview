defmodule Airport do
  use Ecto.Schema

  @moduledoc """
  Schema matching CSV format:
  1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports
  """

  schema "airports" do
    field(:airport_id, :string)
    field(:name, :string)
    field(:city, :string)
    field(:country, :string)
    field(:latitude, :float)
    field(:longitude, :float)
  end

  def schema_headers do
    [:id | headers] = Airport.__schema__(:fields)
    headers
  end
end
