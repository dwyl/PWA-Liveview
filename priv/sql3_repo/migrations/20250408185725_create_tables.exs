defmodule LiveviewPwa.Sql3Repo.Migrations.CreateTables do
  use Ecto.Migration

  @moduledoc """
  Check the Sqlite3 database directly by running:

      ## Direct Sqlite3 commands
      ```
      > sqlite db/main.db
      > .tables
      airports           schema_migrations  yjs_documents
      > .schema
      CREATE TABLE IF NOT EXISTS "schema_migrations" ("version" INTEGER PRIMARY KEY, "inserted_at" TEXT);
      CREATE TABLE IF NOT EXISTS "airports" ("id" INTEGER, "airport_id" TEXT, "name" TEXT, "city" TEXT, "country" TEXT, "latitude" NUMERIC, "longitude" NUMERIC, PRIMARY KEY ("id","airport_id"));
      CREATE TABLE IF NOT EXISTS "yjs_documents" ("id" TEXT PRIMARY KEY, "y_doc" BLOB);
      > .pragma table_info(yjs_documents);
      0|id|TEXT|0||1
      1|y_doc|BLOB|0||0
      ```
  """
  def change do
    create_if_not_exists table(:airports) do
      add :airport_id, :string, primary_key: true
      add :name, :string
      add :city, :string
      add :country, :string
      add :latitude, :float
      add :longitude, :floats
    end

    create_if_not_exists table(:counter_state, primary_key: false) do
      add :id, :string, primary_key: true, default: "counter", null: false
      add :counter, :integer, default: 20
    end

    execute("""
      INSERT OR IGNORE INTO counter_state (id, counter)
      VALUES ('counter', 20)
    """)

    # create_if_not_exists table(:yjs_documents, primary_key: false) do
    #   add :id, :string, primary_key: true, default: "yjs-doc", null: false
    #   add :y_doc, :binary # the Sqlite3 blob type

    # end

    # execute("""
    #   INSERT OR IGNORE INTO yjs_documents (id, y_doc)
    #   VALUES ('yjs-doc', x'') -- x'' = empty binary
    # """)
  end
end
