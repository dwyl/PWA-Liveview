defmodule LiveviewPwaWeb.Router do
  use LiveviewPwaWeb, :router

  alias LiveviewPwaWeb.{Endpoint, MountUser}
  alias Phoenix.Token

  # Note: After adding 'preload', submit your domain to
  # Ensure you can maintain HTTPS for the entire domain and all subdomains
  # indefinitely before submitting

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LiveviewPwaWeb.Layouts, :root}
    plug BrowserCSP
    plug PlugUA
    plug :set_current_user
    plug :protect_from_forgery
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug :fetch_session
    plug :protect_from_forgery
  end

  scope "/", LiveviewPwaWeb do
    pipe_through :browser

    live_session :pretend_authenticated,
      on_mount: {MountUser, :ensure_authenticated} do
      live "/", StockPhxSyncLive, :index
      live "/yjs", StockYjsLive, :index
      live "/map", MapLive, :index
    end

    match(:*, "/:p", NotFound, :render)
  end

  scope "/api", LiveviewPwaWeb do
    pipe_through :api

    get "/connectivity", ConnectivityController, :check
    get "/user_token", UserTokenController, :show
    get "/wasm", WasmController, :load
    # test endpoints
    get "/sql3_counter", Sql3CounterController, :show
    get "/pg_counter", PgCounterController, :show
  end

  def set_current_user(conn, _opts) do
    case get_session(conn, :user_id) do
      nil ->
        user_id = :rand.uniform(10_000)
        user_token = Token.sign(Endpoint, "user token", user_id)

        conn
        |> put_session(:user_id, user_id)
        |> put_session(:user_token, user_token)

      _user_id ->
        conn
    end
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:liveview_pwa, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: LiveviewPwaWeb.Telemetry
    end
  end
end
