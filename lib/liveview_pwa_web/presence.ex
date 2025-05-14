defmodule LiveviewPwaWeb.Presence do
  use Phoenix.Presence,
    otp_app: :liveivew_pwa,
    pubsub_server: :pubsub
end
