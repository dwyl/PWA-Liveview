defmodule LiveviewPwaWeb.LoginLive do
  use LiveviewPwaWeb, :live_view

  alias LiveviewPwaWeb.{Menu, PwaLiveComp}

  require Logger

  @impl true
  def render(assigns) do
    ~H"""
    <.live_component
      :if={@env === :prod}
      module={PwaLiveComp}
      id="pwa_action-login"
      update_available={@update_available}
    />

    <Menu.display active_path={@active_path} />

    <div class="flex flex-col items-center justify-center px-6 py-8 mx-auto lg:py-0 mt-8">
      <div class={[
        "w-full rounded-lg shadow-md sm:max-w-md xl:p-0",
        @user_id && "bg-indigo-600",
        !@user_id && "bg-orange-200"
      ]}>
        <div class="p-6 space-y-6 sm:p-8 text-center">
          <%= if @user_id do %>
            <!-- LOGGED IN STATE -->
            <h1 class="text-2xl font-bold text-orange-300">
              Start Browsing
            </h1>
            <div class="border border-black bg-orange-200 rounded-lg p-4 mt-2">
              <p class="text-lg font-medium text-indigo-900">
                You are currently logged in as user: <code>{@user_id}</code>
              </p>
            </div>
          <% else %>
            <!-- LOGGED OUT STATE -->
            <h1 class="text-2xl font-bold text-indigo-800">
              My dummy Login
            </h1>
            <.form for={%{}} action={~p"/set_session"}>
              <button
                type="submit"
                aria-label="Login as Guest"
                class="w-full text-xl btn btn-soft btn-primary"
              >
                Click here!
              </button>
            </.form>
          <% end %>
        </div>
      </div>
    </div>
    <.icon name="hero-home text-white h-5 w-5" />
    """
  end

  @impl true
  def mount(_params, session, socket) do
    user_id = session["user_id"]
    os = session["os"]
    env = Application.fetch_env!(:liveview_pwa, :env)

    socket =
      socket
      |> assign(:user_id, user_id)
      |> assign(:os, os)
      |> assign(:env, env)
      |> assign(:trigger, false)
      |> assign(:update_available, false)
      |> assign(:active_path, "/")
      |> assign(:user_token, session["user_token"])
      |> assign(:page_title, "Login")

    {:ok, socket}
  end

  @impl true
  def handle_event("create", _, socket) do
    Logger.debug("click")
    {:noreply, assign(socket, :trigger, true)}
  end

  def handle_event("sw-lv-ready", _, socket) do
    Logger.warning(" LOgin sw-lv-ready")
    {:noreply, put_flash(socket, :info, "Service Worker ready")}
  end

  def handle_event("sw-lv-error", _, socket) do
    {:noreply, put_flash(socket, :error, "Service Worker error. This app can't work offline")}
  end
end
