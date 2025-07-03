defmodule LiveviewPwa.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  require Logger

  @impl true
  def start(_type, _args) do
    LiveviewPwa.Release.migrate()

    db = setup_db_path()

    children = [
      LiveviewPwaWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:liveview_pwa, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: :pubsub},
      LiveviewPwa.PgRepo,
      LiveviewPwa.Sql3Repo,
      LiveviewPwa.Presence,
      {LiveviewPwa.Counter, [db]},
      {AirportDB, [db]},
      {LiveviewPwaWeb.Endpoint, phoenix_sync: Phoenix.Sync.plug_opts()}
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

  defp setup_db_path do
    _db = Application.get_env(:liveview_pwa, LiveviewPwa.Sql3Repo)[:database]
  end
end
