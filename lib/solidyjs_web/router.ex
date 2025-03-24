defmodule SolidyjsWeb.Router do
  use SolidyjsWeb, :router

  @csp (case MIX_ENV do
          :prod ->
            "require-trusted-types-for 'script'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src http://localhost:* ws://localhost:* https://api.maptiler.com/; img-src 'self' data: https://*.maptiler.com/ https://api.maptiler.com/; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; default-src 'self'; frame-ancestors 'none'; base-uri 'self'"

          _ ->
            "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src http://localhost:* ws://localhost:* https://api.maptiler.com/; img-src 'self' data: https://*.maptiler.com/ https://api.maptiler.com/; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; default-src 'self'; frame-ancestors 'none'; base-uri 'self'"
        end)

  # Two years in seconds (recommended for preload)
  @hsts_max_age 63_072_000

  @security_headers %{
    "content-security-policy" => @csp,
    "cross-origin-opener-policy" => "same-origin",
    "strict-transport-security" => "max-age=#{@hsts_max_age}; includeSubDomains; preload"
  }

  # Note: After adding 'preload', submit your domain to https://hstspreload.org/
  # Ensure you can maintain HTTPS for the entire domain and all subdomains
  # indefinitely before submitting

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {SolidyjsWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers, @security_headers

    plug :set_current_user
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", SolidyjsWeb do
    pipe_through :browser

    live_session :pretend_authenticated,
      on_mount: {SolidyjsWeb.MountUserId, :ensure_authenticated} do
      get "/connectivity", ConnectivityController, :check
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
