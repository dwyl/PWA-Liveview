defmodule Solidyjs.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    start_ets_tables()
    Solidyjs.Release.migrate()

    children = [
      SolidyjsWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:solidyjs, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: :pubsub},
      SolidyjsWeb.Endpoint,
      Solidyjs.Repo,
      {SqliteHandler, [
        Application.get_env(:solidyjs, :sqlite_handler)[:database_path],
        "airports"
      ]}
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

  defp start_ets_tables do
    :app_state = :ets.new(:app_state, [:named_table, :public])

    :stock =
      :ets.new(:stock, [:named_table, :public, :set, {:read_concurrency, true}])
  end
end
