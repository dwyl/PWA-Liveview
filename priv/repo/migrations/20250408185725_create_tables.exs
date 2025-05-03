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

    create_if_not_exists table(:yjs_documents, primary_key: false) do
      add :id, :string, primary_key: true
      add :y_doc, :binary

    end

    execute("""
      INSERT OR IGNORE INTO yjs_documents (id, y_doc)
      VALUES ('yjs-doc', x'') -- x'' = empty binary
    """)
  end
end
