defmodule ViteHelper do
  require Logger

  @moduledoc """
  A helper module to manage Vite fingerprinted assets in a Phoenix application.

  This module provides a function to retrieve the path of an asset based on its fingerprinted name.

  It reads the Vite manifest file to find the correct path for the asset.

    ## Example
    To use this module, you can call the `path/1` function with the asset name:

    - in the template:
      ```html
        <script src={ViteHelper.path("assets/app.js")}></script>
      ```

    - in the console:

          iex> ViteHelper.path("assets/app.js")
          "/assets/app-1234567890abcdef.js"
  """

  def path(asset) do
    manifest = get_manifest()

    case manifest[asset] do
      %{"file" => file} -> "/#{file}"
      _ -> raise "Asset #{asset} not found in manifest"
    end
  end

  # !!! this can possibly crash if the manifest is not found in DEV mode
  defp get_manifest do
    Path.join(:code.priv_dir(:liveview_pwa), "/static/.vite/manifest.json")
    |> File.read!()
    |> Jason.decode!()
  end

  def get_css do
    get_manifest()
    |> Enum.flat_map(fn {_key, entry} ->
      Map.get(entry, "css", [])
    end)
    |> Enum.uniq()
    |> List.first()
  end
end
