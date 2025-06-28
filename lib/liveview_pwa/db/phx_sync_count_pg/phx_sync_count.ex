defmodule LiveviewPwa.PhxSyncCount do
  @moduledoc """
  - define `schema` matching CSV format:
  1|Goroka Airport|Goroka|Papua New Guinea|GKA|AYGA|-6.08168983459|145.391998291|5282.0|10|U|Pacific/Port_Moresby|airport|OurAirports

  - getter `municipalities/0` returns all airports from the database.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query, only: [from: 2]

  alias LiveviewPwa.PgRepo

  require Logger

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

  @type t :: %__MODULE__{
          id: String.t(),
          counter: integer()
        }

  @spec query_current() :: Ecto.Query.t()
  def query_current do
    from(c in __MODULE__, where: c.id == "phx-sync")
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(struct, %{} = params) do
    struct
    |> cast(params, [:counter])
    |> validate_required([:counter])
    |> unique_constraint(:id, name: :count_id_key_unique)
  end

  # return nil or %electCount{} struct
  @spec current() :: t() | nil
  def current do
    PgRepo.get(__MODULE__, "phx-sync")
  end

  @spec save_counter(t(), integer()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def save_counter(%__MODULE__{} = struct, new_counter) do
    struct
    |> changeset(%{counter: new_counter})
    |> PgRepo.update()
  end

  @spec set_counter(integer()) :: {:ok, t()} | {:error, :not_found} | {:error, Ecto.Changeset.t()}
  def set_counter(new_counter) do
    case current() do
      nil -> {:error, :not_found}
      struct -> save_counter(struct, new_counter)
    end
  end

  @spec decrement(integer()) :: {:ok, integer()} | {:error, any()}
  def decrement(d) do
    PgRepo.transaction(fn ->
      case current() do
        nil ->
          {:error, :not_found}

        %__MODULE__{counter: c} = struct ->
          new_val = rem(@init + c - d + 1, @init + 1)
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
