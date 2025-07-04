import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/LiveviewPwa start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.

config :exqlite, default_chunk_size: 100

if System.get_env("PHX_SERVER") do
  config :liveview_pwa, LiveviewPwaWeb.Endpoint, server: true
end

# The secret key base is used to sign/encrypt cookies and other secrets.
# A default value is used in config/dev.exs and config/test.exs but you
# want to use a different value for prod and you most likely don't want
# to check this value into version control, so we use an environment
# variable instead.
if config_env() == :prod do
  database_path =
    System.get_env("DATABASE_PATH") ||
      "/db/main.sql3"

  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  pg_config = [
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6
  ]

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "localhost"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :liveview_pwa, LiveviewPwa.PgRepo, pg_config

  config :liveview_pwa, LiveviewPwa.Sql3Repo,
    database: database_path,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    show_sensitive_data_on_connection_error: true

  # config :electric,

  # Enable IPv6 and bind on all interfaces.
  #   replication_connection_opts: Electric.Config.parse_postgresql_uri!(pg_config[:url])

  # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
  # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
  # for details about using IPv6 vs IPv4 and loopback vs public addresses.
  config :liveview_pwa, LiveviewPwaWeb.Endpoint,
    # <- CDN [host: "cdn.example.com"],
    static_url: [path: "/"],
    cache_static_manifest: "priv/static/manifest.webmanifest",
    url: [host: host, port: port, scheme: "https"],
    http: [
      {:port, port},
      # {:ip, {0, 0, 0, 0, 0, 0, 0, 0}}
      :inet6
    ],
    secret_key_base: secret_key_base,
    check_origin: ["//#{host}", "//localhost"],
    force_ssl: [hsts: true]

  config :liveview_pwa, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  # User access token configuration
  # config :liveview_pwa, :access_token_ttl,
  #   System.get_env("ACCESS_TOKEN_MAX_AGE", "15") |> String.to_integer()

  config :liveview_pwa,
    # 1 hour
    access_token_ttl: 60 * 60

  config :logger, level: :info

  config :phoenix_sync,
    env: config_env(),
    mode: :embedded,
    repo: LiveviewPwa.PgRepo

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :liveview_pwa, LiveviewPwaWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :liveview_pwa, LiveviewPwaWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
