defmodule LiveviewPwa.Presence do
  use Phoenix.Presence,
    otp_app: :liveivew_pwa,
    pubsub_server: :pubsub

  # @impl true
  # def init(_), do: {:ok, %{}}

  # @impl true
  # def fetch(topic, presences) do
  #   dbg(topic)

  #   for {key, %{metas: [_meta | _metas]}} <- presences, into: %{} do
  #     {key, %{id: key}}
  #   end
  # end

  # def fetch("presence", presences) do
  #   dbg(presences)

  # end

  # @impl true
  # def handle_metas("presence", %{joins: joins, leaves: leaves}, presences, state) do
  #   dbg({joins, leaves, presences})
  #   # for {user_id, presence} <- joins do
  #   #   user_data = %{id: user_id, user: presence.user, metas: Map.fetch!(presences, user_id)}
  #   #   msg = {__MODULE__, {:join, user_data}}
  #   #   Phoenix.PubSub.local_broadcast(:pubsub, "proxy:presence", msg)
  #   # end

  #   # for {user_id, presence} <- leaves do
  #   #   metas =
  #   #     case Map.fetch(presences, user_id) do
  #   #       {:ok, presence_metas} -> presence_metas
  #   #       :error -> []
  #   #     end

  #   #   user_data = %{id: user_id, user: presence.user, metas: metas}
  #   #   msg = {__MODULE__, {:leave, user_data}}
  #   #   Phoenix.PubSub.local_broadcast(Hello.PubSub, "proxy:presence", msg)
  #   # end

  #   {:ok, state}
  # end

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
