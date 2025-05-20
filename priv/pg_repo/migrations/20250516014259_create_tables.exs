defmodule LiveviewPwa.PgRepo.Migrations.CreateTables do
  use Ecto.Migration

  @init 20

  def change do
    create table(:phx_sync_counts, primary_key: false) do
      add :counter, :integer, default: @init, null: false
      add :id, :string, primary_key: true, default: "phx-sync", null: false
    end

    # Ensure only one row can exist by enforcing uniqueness on the constant key
    create unique_index(:phx_sync_counts, [:id], name: :count_id_key_unique)

    execute("""
      INSERT INTO phx_sync_counts (id, counter)
      VALUES ('phx-sync', #{@init})
      ON CONFLICT (id) DO NOTHING;
    """)

    # execute("""
    #   INSERT INTO electric_counts (id, y_doc)
    #   VALUES ('yjs-doc', decode('', 'hex'))
    #   ON CONFLICT (id) DO NOTHING;
    # """)
  end
end
