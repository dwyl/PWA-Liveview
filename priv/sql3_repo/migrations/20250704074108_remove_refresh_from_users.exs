defmodule LiveviewPwa.Sql3Repo.Migrations.RemoveRefreshFromUsers do
  use Ecto.Migration
  # alias Ecto.Adapters.SQL

  def change do
    alter table(:users) do
    remove :refresh_token
    end
  end


  # def change do
  #   if column_refresh_exists? do
  #     execute("ALTER TABLE users DROP COLUMN refresh_token;")
  #   end

  # end

  # defp column_refresh_exists? do
  #   query = "PRAGMA table_info(users);"

  #   case SQL.query(LiveviewPwa.Sql3Repo, query, []) do
  #     {:ok, %{rows: rows}} ->
  #       Enum.any?(rows, fn [_, name | _rest] -> name == "refresh_token" end)

  #     {:error, _} ->
  #       false
  #   end
  # end
end
