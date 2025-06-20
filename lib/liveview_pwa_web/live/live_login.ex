defmodule LiveviewPwaWeb.LoginLive do
  use LiveviewPwaWeb, :live_view
  alias LiveviewPwaWeb.PwaLiveComp
  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <.live_component module={PwaLiveComp} id="pwa_action-map" update_available={@update_available} />

    <LiveviewPwaWeb.Menu.display />

    <div class="flex flex-col items-center justify-center px-6 py-8 mx-auto lg:py-0 mt-8">
      <div class={[
        "w-full rounded-lg shadow-md sm:max-w-md xl:p-0",
        @user_id && "bg-bisque",
        !@user_id && "bg-slateblue"
      ]}>
        <div class="p-6 space-y-6 sm:p-8 text-center">
          <%= if @user_id do %>
            <!-- LOGGED IN STATE -->
            <h1 class="text-2xl font-bold text-midnightblue">
              Start Browsing
            </h1>
            <div class="bg-slateblue border border-midnightblue text-white rounded-lg p-4 mt-2">
              <p class="text-lg font-medium">
                You are currently logged in as user:
                <span class="font-mono underline">@{@user_id}</span>
              </p>
            </div>
          <% else %>
            <!-- LOGGED OUT STATE -->
            <h1 class="text-2xl font-bold text-white">
              My dummy Login
            </h1>
            <.form for={%{}} action={~p"/set_session"} phx-trigger-action={true}>
              <button
                type="submit"
                aria-label="Login as Guest"
                class="w-full bg-bisque text-midnightblue font-medium text-lg hover:bg-white hover:text-slateblue focus:ring-4 focus:outline-none focus:ring-bisque rounded-lg px-5 py-2.5 transition"
              >
                Click to enable navigation
              </button>
            </.form>
          <% end %>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def mount(_params, session, socket) do
    user_id = session["user_id"]

    socket =
      socket
      |> assign(:user_id, user_id)
      |> assign(:os, "unknown")
      |> assign(:update_available, false)
      |> assign(:user_token, session["user_token"])
      |> assign(:page_title, "Login")

    {:ok, socket}
  end

  @impl true
  def handle_event("sw-lv-ready", _, socket) do
    Logger.debug("sw-lv-ready")
    {:noreply, put_flash(socket, :info, "Service Worker ready")}
  end

  def handle_event("sw-lv-error", _, socket) do
    {:noreply, put_flash(socket, :error, "Service Worker error. This app can't work offline")}
  end
end
