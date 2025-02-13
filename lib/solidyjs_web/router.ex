defmodule SolidyjsWeb.Router do
  use SolidyjsWeb, :router

  @csp (case MIX_ENV do
          :prod ->
            "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src http://localhost:* ws://localhost:* https://api.maptiler.com/; img-src 'self' data: https://api.maptiler.com/; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' "

          _ ->
            "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src http://localhost:* ws://localhost:* https://api.maptiler.com/; img-src 'self' data: https://api.maptiler.com/; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' "
        end)

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {SolidyjsWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers, %{"content-security-policy" => @csp}

    plug :set_current_user
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  live_session :default do
    scope "/", SolidyjsWeb do
      pipe_through :browser
      get "/connectivity", ConnectivityController, :check
      # live "/", CounterCRDTLive, :index
      live "/", StockLive, :index
      live "/map", MapLive, :index
    end
  end

  def set_current_user(conn, _opts) do
    conn
    |> get_session(:user_id)
    |> case do
      nil ->
        Plug.Conn.put_session(conn, :user_id, :rand.uniform(1000))

      _user_id ->
        conn
    end
  end

  def csp do
  end

  # Other scopes may use custom stacks.
  # scope "/api", SolidyjsWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard in development
  if Application.compile_env(:solidyjs, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: SolidyjsWeb.Telemetry
    end
  end
end
