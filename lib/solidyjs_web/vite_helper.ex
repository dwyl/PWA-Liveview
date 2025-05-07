defmodule ViteHelper do
  require Logger

  def path(asset) do
    manifest = get_manifest()

    case manifest[asset] do
      %{"file" => file} -> "/#{file}"
      _ -> raise "Asset #{asset} not found in manifest"
    end
  end

  # !!! this can possibly crash if the manifest is not found
  defp get_manifest do
    Path.join(:code.priv_dir(:solidyjs), "/static/.vite/manifest.json")
    |> File.read!()
    |> Jason.decode!()
  end
end
