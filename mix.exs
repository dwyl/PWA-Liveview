defmodule Solidyjs.MixProject do
  use Mix.Project

  def project do
    [
      app: :solidyjs,
      version: "0.1.0",
      elixir: "~> 1.18",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {Solidyjs.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.7.20"},
      {:phoenix_html, "~> 4.1"},
      {:phoenix_live_view, "~> 1.0"},
      {:bandit, "~> 1.6"},
      {:req, "~> 0.5.8"},
      {:nimble_csv, "~> 1.2"},
      {:exqlite, "~> 0.27"},
      {:ecto_sqlite3, "~> 0.18.0"},
      {:ecto_sql, "~> 3.12"},
      {:phoenix_live_dashboard, "~> 0.8.3"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:dns_cluster, "~> 0.1.1"},
      {:heroicons,
       github: "tailwindlabs/heroicons",
       tag: "v2.1.1",
       sparse: "optimized",
       app: false,
       compile: false,
       depth: 1},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:sobelow, "~> 0.13", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.1", only: [:dev, :test], runtime: false},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:floki, ">= 0.30.0", only: :test},
      {:tailwind, "~> 0.2", runtime: Mix.env() == :dev}
      # {:esbuild, "~> 0.8", runtime: Mix.env() == :dev},
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "cmd --cd assets pnpm i"],
      # watch: ["cmd --cd assets vite build --watch"],
      # "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      # "assets.build": ["tailwind solidyjs", "esbuild solidyjs"],
      "assets.deploy": [
        "tailwind solidyjs --minify",
        "cmd --cd assets vite build --config vite.config.js",
        "phx.digest"
      ]
    ]
  end
end
