defmodule LiveviewPwa.PhxSyncCount do
  use Ecto.Schema
  import Ecto.Query, only: [from: 2]
  import Ecto.Changeset
  alias LiveviewPwa.PgRepo
  require Logger

  @moduledoc """
  - define `schema` matching CSV format:
  1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports

  - getter `municipalities/0` returns all airports from the database.
  """

  # @primary_key false
  # schema "electric_counts" do
  #   field(:counter, :integer, default: 20)
  #   field(:id, :string, primary_key: true, default: "elec")
  # end

  @init 20
  @primary_key {:id, :string, autogenerate: false}

  schema "phx_sync_counts" do
    field(:counter, :integer, default: @init)
  end

  def query_current do
    from(c in __MODULE__, where: c.id == "phx-sync")
  end

  def changeset(struct, %{} = params) do
    struct
    |> cast(params, [:counter])
    |> validate_required([:counter])
    |> unique_constraint(:id, name: :count_id_key_unique)
  end

  # return nil or %electCount{} struct
  def current do
    PgRepo.get(__MODULE__, "phx-sync")
  end

  def save_counter(%__MODULE__{} = struct, new_counter) do
    struct
    |> changeset(%{counter: new_counter})
    |> PgRepo.update()
  end

  def set_counter(new_counter) do
    case current() do
      nil -> {:error, :not_found}
      struct -> save_counter(struct, new_counter)
    end
  end

  def decrement(d) do
    dbg(d)

    PgRepo.transaction(fn ->
      case current() do
        nil ->
          {:error, :not_found}

        %__MODULE__{counter: c} = struct ->
          new_val = rem(@init + c - d + 1, @init + 1) |> dbg()
          save_counter(struct, new_val)
      end
    end)
    |> case do
      {:ok, {:ok, %__MODULE__{counter: new_val}}} -> {:ok, new_val}
      {:ok, other} -> other
      {:error, reason} -> {:error, reason}
    end
  end
end
