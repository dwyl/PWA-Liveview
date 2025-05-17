defmodule LiveviewPwa.PgRepo do
  use Ecto.Repo,
    otp_app: :liveview_pwa,
    adapter: Ecto.Adapters.Postgres
end
