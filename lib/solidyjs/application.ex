defmodule Solidyjs.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @max 20

  @impl true
  def start(_type, _args) do
    db = setupDbPath()
    [{:ok, _, _}] = Solidyjs.Release.migrate()

    children = [
      SolidyjsWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:solidyjs, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: :pubsub},
      Solidyjs.Repo,
      SolidyjsWeb.Endpoint,
      {AirportDB, [db]},
      {Solidyjs.DocHandler, [db, @max]}
    ]

    opts = [strategy: :one_for_one, name: Solidyjs.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    SolidyjsWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp setupDbPath do
    db = Application.get_env(:solidyjs, Solidyjs.Repo)[:database]
    db_dir = Path.dirname(db)
    :ok = File.mkdir_p!(db_dir)
    :ok = File.chmod!(db_dir, 0o777)
    db
  end
end
