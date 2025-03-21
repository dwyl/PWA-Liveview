import Config

config :solidyjs,
  generators: [timestamp_type: :utc_datetime]

config :solidyjs,
  ecto_repos: [Solidyjs.Repo]

config :solidyjs, Solidyjs.Repo,
  adapter: Ecto.Adapters.SQLite3,
  database: Path.expand("../db/airports.db", Path.dirname(__ENV__.file)),
  pool_size: 5,
  show_sensitive_data_on_connection_error: true

config :exqlite, force_build: false
# Configures the endpoint
config :solidyjs, SolidyjsWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [html: SolidyjsWeb.ErrorHTML, json: SolidyjsWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: :pubsub,
  live_view: [signing_salt: "zhtHGb8Q"]

# Configure tailwind (the version is required)
config :tailwind,
  version: "3.4.3",
  solidyjs: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
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
