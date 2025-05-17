defmodule LiveviewPwa.ElecCount do
  use Ecto.Schema
  import Ecto.Query, only: [from: 2]
  alias LiveviewPwa.ElecCount
  require Logger

  @moduledoc """
  - define `schema` matching CSV format:
  1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports

  - getter `municipalities/0` returns all airports from the database.
  """

  @primary_key false
  schema "electric_counts" do
    field(:elec_counter, :integer, default: 20)
    field(:id, :string, primary_key: true, default: "elec")
  end

  def counter_query do
    from(c in ElecCount, where: c.id == "elec")
  end
end
