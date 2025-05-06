defmodule ViteHelper do
  @manifest_path Path.join(:code.priv_dir(:solidyjs), "static/.vite/manifest.json")

  def path(asset) do
    manifest = get_manifest()

    case manifest[asset] do
      %{"file" => file} -> "/#{file}"
      _ -> raise "Asset #{asset} not found in manifest"
    end
  end

  defp get_manifest do
    @manifest_path
    |> File.read!()
    |> Jason.decode!()
  end
end
