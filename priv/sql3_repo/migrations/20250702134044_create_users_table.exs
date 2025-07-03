defmodule LiveviewPwa.Sql3Repo.Migrations.CreateUsersTable do
  use Ecto.Migration

  def change do
    create_if_not_exists table(:users) do
      add :user_token, :string
      add :refresh_token, :string
      add :is_valid, :boolean, default: true
      timestamps()
    end
  end
end
