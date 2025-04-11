defmodule Solidyjs.Repo.Migrations.CreateTables do
  use Ecto.Migration

  def change do
    create table(:airports,  primary_key: true) do
      # create table(:airports, primary_key: false) do
      add :airport_id, :integer
      add :name, :string
      add :city, :string
      add :country, :string
      add :iata, :string
      add :icao, :string
      add :latitude, :float
      add :longitude, :float
      add :altitude, :integer
      add :timezone, :float
      add :dst, :string
      add :tz, :string
      add :type, :string
      add :source, :string
    end

    create table(:stock, primary_key: false) do
      add :id, :string, primary_key: true
      add :value, :integer
      add :state, :binary
    end
  end
end
