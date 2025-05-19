defmodule LiveviewPwaWeb.Presence do
  use Phoenix.Presence,
    otp_app: :liveivew_pwa,
    pubsub_server: :pubsub

  @impl true
  def init(_), do: {:ok, %{}}

  @impl true
  def fetch("presence", presences) do
    for {key, %{metas: [meta | _metas]}} <- presences, into: %{} do
      {key, %{id: meta.id}}
    end
  end

  # def sieve(users, joins, leaves, id) do
  #   [users | Map.values(joins)]
  #   |> List.flatten()
  #   |> MapSet.new()
  #   # |> MapSet.difference(MapSet.new(Map.keys(leaves)))
  #   |> MapSet.difference(MapSet.new(Map.values(leaves)))
  #   |> MapSet.to_list()

  #   # [users | Map.keys(joins)]
  #   # |> List.flatten()
  #   # |> Enum.uniq()
  #   # |> Enum.reject(&(&1 in Map.keys(leaves)))
  # end
end
