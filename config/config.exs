import Config

config :solidyjs,
  generators: [timestamp_type: :utc_datetime]

config :solidyjs,
  ecto_repos: [Solidyjs.Repo]

config :solidyjs, :csp_nonce, :crypto.strong_rand_bytes(16) |> Base.encode16()

config :solidyjs, Solidyjs.Repo,
  adapter: Ecto.Adapters.SQLite3,
  database: Path.expand("../db/main.db", Path.dirname(__ENV__.file)),
  pool_size: 5,
  show_sensitive_data_on_connection_error: true,
  default_transaction_mode: :immediate

config :exqlite, force_build: true

# Configures the endpoint
config :solidyjs, SolidyjsWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  pubsub_server: :pubsub,
  live_view: [signing_salt: "zhtHGb8Q"],
  render_errors: [
    formats: [json: SolidyjsWeb.ErrorJSON],
    layout: false
  ]

# config :phoenix,
# static_compressors: [
# Phoenix.Digester.Gzip,
# ExBrotli.DigesterCompressor,
# ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
