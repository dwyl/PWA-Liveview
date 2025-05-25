defmodule LiveviewPwa.Presence do
  @moduledoc false
  use Phoenix.Presence,
    otp_app: :liveivew_pwa,
    pubsub_server: :pubsub
end
