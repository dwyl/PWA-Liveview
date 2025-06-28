defmodule LiveviewPwaWeb.Router do
  use LiveviewPwaWeb, :router

  import Phoenix.LiveDashboard.Router

  alias LiveviewPwaWeb.MountUser

  # Note: After adding 'preload', submit your domain to
  # Ensure you can maintain HTTPS for the entire domain and all subdomains
  # indefinitely before submitting

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LiveviewPwaWeb.Layouts, :root}
    plug :protect_from_forgery
    plug PlugUA
    plug :put_secure_browser_headers
    plug BrowserCSP
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
  end

  scope "/", LiveviewPwaWeb do
    pipe_through :browser

    # get "/", LoginController, :index
    live "/", LoginLive, :index
    live "/off-session", OffSessionLive, :index

    post "/set_session", LoginController, :set_session
    get "/logged-in", LoginController, :index

    live_session :authenticated,
      on_mount: {MountUser, :ensure_authenticated} do
      live "/sync", StockPhxSyncLive, :index
      live "/yjs", StockYjsLive, :index
      live "/map", MapLive, :index
    end
  end

  scope "/api", LiveviewPwaWeb.Api do
    pipe_through :api

    get "/connectivity", ConnectivityController, :check
    post "/refresh_token", UserTokenController, :refresh
    # get "/wasm", WasmController, :load

    # test endpoints
    get "/sql3_counter", Sql3CounterController, :show
    get "/pg_counter", PgCounterController, :show
  end

  # Enable LiveDashboard in development
  # if Application.compile_env(:liveview_pwa, :dev_routes) do
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).

  pipeline :dashboard do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LiveviewPwaWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
    plug :auth

    defp auth(conn, _opts) do
      username = System.get_env("AUTH_USERNAME", "admin")
      password = System.get_env("AUTH_PASSWORD", "password")
      Plug.BasicAuth.basic_auth(conn, username: username, password: password)
    end
  end

  pipe_through :dashboard

  scope "/" do
    live_dashboard "/dashboard",
      metrics: LiveviewPwaWeb.Telemetry,
      ecto_repos: [LiveviewPwa.Sql3Repo, LiveviewPwa.PgRepo]
  end

  scope "/", LiveviewPwaWeb do
    pipe_through :browser
    match(:*, "/*path", NotFoundController, :display)
  end
end
