defmodule LiveviewPwaWeb.OffSessionLive do
  use LiveviewPwaWeb, :live_view
  alias LiveviewPwaWeb.{Menu, Users}

  def render(assigns) do
    ~H"""
    <%!-- <.live_component module={PwaLiveComp} id="pwa_action-map" update_available={@update_available} /> --%>
    <Users.display user_id={@user_id} module_id="users-map" />
    <Menu.display />
    <h1 class="mt-4">
      This is an "Off" <code>live_session</code> LiveView.
    </h1>
    """
  end

  def mount(_params, session, socket) do
    {:ok, assign(socket, :user_id, session["user_id"])}
  end
end
