defmodule LiveviewPwa.PgRepo.Migrations.CreateTables do
  use Ecto.Migration

  def change do
    create table(:electric_counts, primary_key: false) do
      add :elec_counter, :integer, default: 20, null: false
      add :id, :string, primary_key: true, default: "elec", null: false
    end

    # Ensure only one row can exist by enforcing uniqueness on the constant key
    create unique_index(:electric_counts, [:id], name: :elect_id_key_unique)

    execute("""
      INSERT INTO electric_counts (id, elec_counter)
      VALUES ('elec', 20)
      ON CONFLICT (id) DO NOTHING;
    """)

    # execute("""
    #   INSERT INTO electric_counts (id, y_doc)
    #   VALUES ('yjs-doc', decode('', 'hex'))
    #   ON CONFLICT (id) DO NOTHING;
    # """)
  end
end
