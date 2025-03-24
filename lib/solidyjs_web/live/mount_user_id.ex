defmodule SolidyjsWeb.MountUserId do
  # import Phoenix.LiveView
  import Phoenix.Component

  def on_mount(:ensure_authenticated, _params, session, socket) do
    # %{"user_id" => user_id} = session
    if user_id = Map.get(session, "user_id") do
      {:cont, assign(socket, %{user_id: user_id, update_available: false})}
    else
      {:halt, socket}
    end
  end
end
