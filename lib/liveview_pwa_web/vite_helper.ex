# if Application.compile_env!(:liveview_pwa, :env) == :prod do
#   defmodule Vite do
#     @moduledoc """
#     A helper module to manage Vite file discovery.

#     It appends "http://localhost:5173" in DEV mode.

#     It finds the fingerprinted name in PROD mode from the .vite/manifest.json file.
#     """
#     require Logger

#     # Ensure the manifest is loaded at compile time in production
#     def path(asset) do
#       manifest = get_manifest()

#       case Path.extname(asset) do
#         ".css" ->
#           get_main_css_in(manifest)

#         _ ->
#           get_name_in(manifest, asset)
#       end
#     end

#     defp get_manifest do
#       manifest_path = Path.join(:code.priv_dir(:liveview_pwa), "static/.vite/manifest.json")

#       with {:ok, content} <- File.read(manifest_path),
#            {:ok, decoded} <- Jason.decode(content) do
#         decoded
#       else
#         _ -> raise "Could not read or decode Vite manifest at #{manifest_path}"
#       end
#     end

#     def get_main_css_in(manifest) do
#       manifest
#       |> Enum.flat_map(fn {_key, entry} ->
#         Map.get(entry, "css", [])
#       end)
#       |> Enum.filter(fn file -> String.contains?(file, "main") end)
#       |> List.first()
#     end

#     def get_name_in(manifest, asset) do
#       case manifest[asset] do
#         %{"file" => file} -> "/#{file}"
#         _ -> raise "Asset #{asset} not found in manifest"
#       end
#     end
#   end
# else
#   defmodule Vite do
#     def path(asset) do
#       "http://localhost:5173/#{asset}"
#     end
#   end
# end
