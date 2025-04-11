defmodule Solidyjs.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    db = Application.get_env(:solidyjs, Solidyjs.Repo)[:database] |> dbg()
    db_dir = Path.dirname(db) |> dbg()
    File.mkdir_p!(db_dir)
    File.chmod!(db_dir, 0o777)
    # Solidyjs.Release.migrate()

    children = [
      SolidyjsWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:solidyjs, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: :pubsub},
      SolidyjsWeb.Endpoint,
      Solidyjs.Repo,
      {SqliteHandler, [db]},
      {Solidyjs.StockDb, [db, "stock"]}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
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
end
