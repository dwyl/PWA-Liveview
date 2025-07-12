defmodule LiveviewPwaWeb.LoginLive do
  use LiveviewPwaWeb, :live_view

  alias LiveviewPwa.User
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
          <%= if not is_nil(@user_id) and @not_expired do %>
            <h1 class="text-2xl font-bold text-orange-200">
              Start Browsing
            </h1>
            <p class="text-white">You need to visit the pages to cache them!</p>
            <div class="border border-black bg-orange-200 rounded-lg p-4 mt-2">
              <p class="text-lg font-medium text-indigo-900">
                You are currently logged in as user: <code>{@user_id}</code>
              </p>
            </div>
          <% else %>
            <h1 class="text-2xl font-bold text-midnightblue">
              My dummy Login
            </h1>
            <.form for={%{}} action={~p"/set_session"}>
              <button type="submit" aria-label="Login as Guest" class="w-full text-xl btn btn-primary">
                Click here!
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
    os = Map.get(session, "os", nil)
    user_token = Map.get(session, "user_token", nil)
    user_id = Map.get(session, "user_id", nil)

    env = Application.fetch_env!(:liveview_pwa, :env)

    case User.check_token(user_token) do
      {:ok, ^user_id} ->
        socket =
          socket
          |> assign(:user_id, user_id)
          |> assign(:os, os)
          |> assign(:env, env)
          |> assign(:not_expired, true)
          |> assign(:trigger, false)
          |> assign(:update_available, false)
          |> assign(:active_path, "/")
          |> assign(:user_token, user_token)
          |> assign(:page_title, "Login")

        {:ok, socket}

      {:error, :unauthorized} ->
        socket =
          socket
          |> assign(:user_id, nil)
          |> assign(:os, os)
          |> assign(:env, env)
          |> assign(:not_expired, false)
          |> assign(:trigger, false)
          |> assign(:update_available, false)
          |> assign(:active_path, "/")
          |> assign(:user_token, nil)
          |> assign(:page_title, "Login")
          |> put_flash(:info, "Session expired")

        {:ok, socket}

      _ ->
        socket =
          socket
          |> assign(:user_id, nil)
          |> assign(:os, os)
          |> assign(:env, env)
          |> assign(:not_expired, false)
          |> assign(:trigger, false)
          |> assign(:update_available, false)
          |> assign(:active_path, "/")
          |> assign(:user_token, nil)
          |> assign(:page_title, "Login")

        {:ok, socket}
    end
  end

  @impl true
  def handle_event("create", _, socket) do
    {:noreply, assign(socket, :trigger, true)}
  end

  def handle_event("sw-lv-ready", _, socket) do
    Logger.warning(" Login sw-lv-ready")
    {:noreply, put_flash(socket, :info, "Service Worker ready")}
  end

  def handle_event("sw-lv-error", _, socket) do
    {:noreply, put_flash(socket, :error, "Service Worker error. This app can't work offline")}
  end
end
