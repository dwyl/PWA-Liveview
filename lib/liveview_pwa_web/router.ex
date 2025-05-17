defmodule LiveviewPwaWeb.Router do
  use LiveviewPwaWeb, :router
  alias Phoenix.Token
  alias LiveviewPwaWeb.{Endpoint, MountUser}

  # Note: After adding 'preload', submit your domain to
  # Ensure you can maintain HTTPS for the entire domain and all subdomains
  # indefinitely before submitting

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {LiveviewPwaWeb.Layouts, :root}
    plug BrowserCSP
    plug :protect_from_forgery
    plug :set_current_user
  end

  scope "/", LiveviewPwaWeb do
    pipe_through :browser

    live_session :pretend_authenticated,
      on_mount: {MountUser, :ensure_authenticated} do
      live "/", StockYjsLive, :index
      live "/elec", StockElectricLive, :index
      live "/map", MapLive, :index
      get "/connectivity", ConnectivityController, :check
    end

    match(:*, "/:p", NotFound, :render)
  end

  def set_current_user(conn, _opts) do
    conn
    |> get_session(:user_id)
    |> case do
      nil ->
        id = :rand.uniform(1000)
        user_token = Token.sign(Endpoint, "user token", id)

        conn
        |> put_session(:user_id, id)
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
