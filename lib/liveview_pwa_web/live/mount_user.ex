defmodule LiveviewPwaWeb.MountUser do
  @moduledoc """
  This module is used for shared features between the LiveView modules.
  in the same sesson.

  - assigns the user_id from the session into the socket
  - handle the shared PWA button delegated to a LC
  - handle the params to set the active path
  """

  use Phoenix.VerifiedRoutes,
    router: LiveviewPwaWeb.Router,
    endpoint: LiveviewPwaWeb.Endpoint,
    statics: ~w(assets fonts images favicon.ico robots.txt)

  import Phoenix.Component
  import Phoenix.LiveView

  require Logger

  @max 20

  def on_mount(:ensure_authenticated, _p, %{"user_id" => user_id} = session, socket) do
    os = session["os"]
    env = Application.fetch_env!(:liveview_pwa, :env)

    user_token = Map.get(session, "user_token", nil)

    case check_user(user_id, user_token) do
      :ok ->
        {:cont,
         socket
         |> assign(:max, @max)
         |> assign(:user_id, user_id)
         |> assign(:env, env)
         #  async push the user token to the client to setup cusstom userSocket
         |> push_event("access-token-ready", %{
           "user_token" => user_token,
           "user_id" => user_id
         })
         |> assign(:os, os)
         |> assign(:update_available, false)
         |> attach_hook(:active, :handle_params, &handle_path_params/3)
         |> attach_hook(:sw, :handle_event, &handle_pwa_event/3)}

      {:error, :not_found} ->
        Logger.warning("User #{user_id} not found on mount")
        {:halt, redirect(socket, to: ~p"/")}
    end
  end

  def on_mount(:ensure_authenticated, _params, _session, socket) do
    {:halt, redirect(socket, to: ~p"/")}
  end

  defp check_user(user_id, user_token) do
    user = LiveviewPwa.User.lookup(user_token)

    if Map.get(user, :id) == user_id and Map.get(user, :is_valid) do
      :ok
    else
      {:error, :not_found}
    end
  end

  #  shared assigns and PWA button handler delegated to a LiveComponent
  defp handle_path_params(_params, url, socket) do
    path = URI.new!(url) |> Map.get(:path)

    {:halt, socket |> assign(:active_path, path)}
  end

  defp handle_pwa_event("sw-lv-ready", _, socket) do
    Logger.debug("sw-lv-ready")
    {:halt, put_flash(socket, :info, "Service Worker ready")}
  end

  defp handle_pwa_event("sw-lv-error", _, socket) do
    {:halt, put_flash(socket, :error, "Service Worker error. This app can't work offline")}
  end

  # delegated to the LiveComponent
  defp handle_pwa_event(_, _, socket) do
    {:cont, socket}
  end
end
