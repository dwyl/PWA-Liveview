# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :solidyjs,
  generators: [timestamp_type: :utc_datetime]

config :solidyjs,
  ecto_repos: [Solidyjs.Repo]

config :solidyjs, Solidyjs.Repo,
  database: Path.expand("../data/airports.db", Path.dirname(__ENV__.file)),
  pool_size: String.to_integer(System.get_env("POOL_SIZE") || "5"),
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

# Configure esbuild (the version is required)
# config :esbuild, :version, "0.24.2"
#   solidyjs: [
#     args:
#       ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
#     cd: Path.expand("../assets", __DIR__),
#     env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
#   ]

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
