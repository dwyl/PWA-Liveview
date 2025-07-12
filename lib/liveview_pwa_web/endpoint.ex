defmodule LiveviewPwaWeb.Endpoint do
  @moduledoc """
  The session will be stored in the cookie and signed,
  this means its contents can be read but not tampered with.
  Note: Set :encryption_salt if you would also like to encrypt it.

  The static files are served at "/" from "priv/static" directory.
  Brotli compression is set so phx.digest will
  deploy compressed static files in production.

  Two sockets are defined:

  - "/live" for Phoenix LiveView
  - "/userocket"

  The "/live" socket uses the session options defined below from a cookie.

  The "/user" socket is configured to check the origin
  against the application environment variable `:websocket_origins`.
  """

  use Phoenix.Endpoint, otp_app: :liveview_pwa

  alias Phoenix.Ecto.CheckRepoStatus
  alias Phoenix.LiveDashboard.RequestLogger
  alias Phoenix.LiveView.Socket

  @session_options [
    store: :cookie,
    key: "_liveview_pwa_key",
    signing_salt: "QncUpwm7",
    same_site: "Lax"
  ]

  socket "/live", Socket,
    websocket: [
      connect_info: [{:session, @session_options}],
      # <- reduces payload size of airports
      compress: true,
      csp_nonce_assign_key: :main_nonce,
      check_origin: ["http://localhost:4000", "https://liveview-pwa.fly.dev"]
    ],
    longpoll: [connect_info: [session: @session_options]]

  socket "/user", LiveviewPwaWeb.UserSocket,
    websocket: [
      csp_nonce_assign_key: :main_nonce,
      connect_info: [
        session: @session_options,
        check_origin: ["http://localhost:4000", "https://liveview-pwa.fly.dev"]
      ]
    ]

  # Serve at "/" the static files from "priv/static" directory.
  # set brotli compression so phx.digest will
  # deploy compressed static files in production.
  plug Plug.Static,
    at: "/",
    from: :liveview_pwa,
    encodings: [{"zstd", ".zstd"}],
    brotli: not code_reloading?,
    gzip: not code_reloading?,
    only: LiveviewPwaWeb.static_paths(),
    headers: %{
      "cache-control" => "public, max-age=31536000"
    },
    content_types: %{
      "webmanifest" => "application/manifest+json",
      "wasm" => "application/wasm"
    }

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.

  if code_reloading? do
    plug Tidewave
  end

  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
    plug CheckRepoStatus, otp_app: :liveview_pwa
  end

  plug RequestLogger,
    param_key: "request_logger",
    cookie_key: "request_logger"

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug LiveviewPwaWeb.Router, csp_nonce_assign_key: :main_nonce
end
