defmodule LiveviewPwa.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  require Logger
  use Application

  @max 20

  @impl true
  def start(_type, _args) do
    db = setupDbPath()
    [{:ok, _, _}] = LiveviewPwa.Release.migrate()

    children = [
      LiveviewPwaWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:liveview_pwa, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: :pubsub},
      LiveviewPwa.Repo,
      LiveviewPwaWeb.Presence,
      LiveviewPwaWeb.Endpoint,
      {AirportDB, [db]},
      {LiveviewPwa.DocHandler, [db, @max]}
    ]

    opts = [strategy: :one_for_one, name: LiveviewPwa.Supervisor]

    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    LiveviewPwaWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp setupDbPath do
    db = Application.get_env(:liveview_pwa, LiveviewPwa.Repo)[:database]

    db_dir = Path.dirname(db)
    # Logger.debug(inspect({Path.basename(db), db_dir}))
    :ok = File.mkdir_p!(db_dir)
    :ok = File.chmod!(db_dir, 0o777)
    db
  end
end
