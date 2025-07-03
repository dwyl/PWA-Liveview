defmodule LiveviewPwaWeb.OffSessionLive do
  use LiveviewPwaWeb, :live_view

  alias LiveviewPwaWeb.{Menu, Users}

  def render(assigns) do
    ~H"""
    <%!-- <.live_component module={PwaLiveComp} id="pwa_action-map" update_available={@update_available} /> --%>
    <Users.display user_id={@user_id} module_id="users-map" />
    <Menu.display active_path={@active_path} />
    <h1 class="mt-4 text-gray-800">
      This is an "Off" <code>live_session</code> LiveView.
    </h1>
    <p class="text-gray-800 mt-2">Hint: to navigate to the dashboard: "admin", "password" !</p>
    """
  end

  def mount(_params, session, socket) do
    {:ok,
     socket
     |> assign(:user_id, session["user_id"])
     |> assign(:env, Application.fetch_env!(:liveview_pwa, :env))
     |> assign(:active_path, "/off-session")}
  end
end
