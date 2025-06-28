[
  import_deps: [:phoenix],
  plugins: [Phoenix.LiveView.HTMLFormatter, Quokka],
  inputs: ["*.{heex,ex,exs}", "{config,lib,test}/**/*.{heex,ex,exs}"],
  quokka: [
    ineffcicient_function_rewrites: true,
    files: %{included: ["lib/"]},
    only: [:pipes, :module_directives, :deprecations, :configs]
  ]
]
