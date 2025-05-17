import Config

config :liveview_pwa,
  generators: [timestamp_type: :utc_datetime]

config :liveview_pwa,
  ecto_repos: [LiveviewPwa.PgRepo, LiveviewPwa.Sql3Repo]

config :liveview_pwa, :csp_nonce, :crypto.strong_rand_bytes(16) |> Base.encode16()

config :liveview_pwa, LiveviewPwa.Sql3Repo,
  adapter: Ecto.Adapters.SQLite3,
  default_transaction_mode: :immediate,
  show_sensitive_data_on_connection_error: true,
  pool_size: 5

config :exqlite, force_build: true

config :liveview_pwa, LiveviewPwa.PgRepo,
  adapter: Ecto.Adapters.Postgres,
  show_sensitive_data_on_connection_error: true,
  pool_size: 5

config :phoenix_sync,
  env: config_env(),
  mode: :embedded,
  repo: LiveviewPwa.PgRepo

# Configures the endpoint
config :liveview_pwa, LiveviewPwaWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  pubsub_server: :pubsub,
  live_view: [signing_salt: "zhtHGb8Q"],
  render_errors: [
    formats: [json: LiveviewPwaWeb.ErrorJSON],
    layout: false
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
