defmodule LiveviewPwa.Sql3Repo do
  @moduledoc false
  use Ecto.Repo,
    otp_app: :liveview_pwa,
    adapter: Ecto.Adapters.SQLite3
end
