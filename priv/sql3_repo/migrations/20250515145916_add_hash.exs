defmodule LiveviewPwa.Sql3Repo.Migrations.AddHash do
  use Ecto.Migration

  def change do
    alter table(:airports) do
      add :hash, :string
    end


  end
end
