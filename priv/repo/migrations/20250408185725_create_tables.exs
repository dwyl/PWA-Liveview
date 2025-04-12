defmodule Solidyjs.Repo.Migrations.CreateTables do
  use Ecto.Migration

  def change do
    create_if_not_exists table(:airports) do
      add :airport_id, :string, primary_key: true
      add :name, :string
      add :city, :string
      add :country, :string
      add :latitude, :float
      add :longitude, :float
    end

    create_if_not_exists table(:stock, primary_key: false) do
      add :id, :string, primary_key: true
      add :value, :integer
      add :state, :binary
    end
  end
end
