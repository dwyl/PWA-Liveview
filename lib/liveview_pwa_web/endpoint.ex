defmodule LiveviewPwaWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :liveview_pwa

  @moduledoc """
  The session will be stored in the cookie and signed,
  this means its contents can be read but not tampered with.
  Note: Set :encryption_salt if you would also like to encrypt it.

  The static files are served at "/" from "priv/static" directory.
  Brotli compression is set so phx.digest will
  deploy compressed static files in production.

  Two sockets are defined:

  - "/live" for Phoenix LiveView
  - "/ydocSocket" for Yjs WebSocket connection

  The "/live" socket uses the session options defined below from a cookie.

  The "/ydoc" socket is configured to check the origin
  against the application environment variable `:websocket_origins`.
  """

  @session_options [
    store: :cookie,
    key: "_liveview_pwa_key",
    signing_salt: "QncUpwm7",
    same_site: "Lax"
  ]

  socket "/live", Phoenix.LiveView.Socket,
    websocket: [connect_info: [session: @session_options], compress: true],
    longpoll: [connect_info: [session: @session_options]]

  socket "/ydoc", LiveviewPwa.YdocSocket,
    websocket: [
      connect_info: [
        session: @session_options,
        check_origin: true
        # :websocket_origins is set in config/runtime.exs
        # to the value of the environment variable PHX_HOST
        # which is set in the Dockerfile.
        # This allows the Yjs WebSocket connection to be
        # established from the client.
        # origins: Application.get_env(:liveview_pwa, :websocket_origins)
      ]
    ]

  # longpoll: false

  # Serve at "/" the static files from "priv/static" directory.
  # set brotli compression so phx.digest will
  # deploy compressed static files in production.
  plug Plug.Static,
    encodings: [{"zstd", ".zstd"}],
    brotli: true,
    gzip: true,
    at: "/",
    from: :liveview_pwa,
    only: ~w(
      assets
      icons
      robots.txt
      sw.js
      manifest.webmanifest
      sitemap.xml
      ),
    headers: %{
      "cache-control" => "public, max-age=31536000"
    }

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Phoenix.LiveDashboard.RequestLogger,
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
  plug LiveviewPwaWeb.Router
end
