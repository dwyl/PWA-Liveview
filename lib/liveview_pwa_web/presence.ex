defmodule LiveviewPwaWeb.Presence do
  use Phoenix.Presence,
    otp_app: :liveivew_pwa,
    pubsub_server: :pubsub

  def sieve(presence_list, joins, leaves, socket_id) do
    {_, joins} =
      Map.pop(joins, socket_id, %{})

    {_, leaves} =
      Map.pop(leaves, socket_id, %{})

    [presence_list | Map.keys(joins)]
    |> List.flatten()
    |> MapSet.new()
    |> MapSet.difference(MapSet.new(Map.keys(leaves)))
    |> MapSet.to_list()
  end
end
