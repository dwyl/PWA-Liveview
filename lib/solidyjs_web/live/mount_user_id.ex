defmodule SolidyjsWeb.MountUserId do
  # import Phoenix.LiveView
  import Phoenix.Component

  def on_mount(:default, _params, session, socket) do
    %{"user_id" => user_id} = session
    {:cont, assign(socket, %{user_id: user_id, update_available: false})}
  end
end
