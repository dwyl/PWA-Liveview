defmodule LiveviewPwa.PgRepo do
  @moduledoc false
  use Ecto.Repo,
    otp_app: :liveview_pwa,
    adapter: Ecto.Adapters.Postgres
end
