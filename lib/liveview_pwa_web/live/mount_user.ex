defmodule LiveviewPwaWeb.MountUser do
  import Phoenix.LiveView
  import Phoenix.Component
  require Logger

  use Phoenix.VerifiedRoutes,
    router: LiveviewPwaWeb.Router,
    endpoint: LiveviewPwaWeb.Endpoint,
    statics: ~w(assets fonts images favicon.ico robots.txt)

  @max 20

  @moduledoc """
  This module is used for shared features between the LiveView modules.
  in the same sesson.

  - assigns the user_id from the session into the socket
  - handle the shared PWA button delegated to a LC
  - handle the params to set the active path
  """

  def on_mount(:ensure_authenticated, _p, %{"user_id" => user_id} = session, socket) do
    os = session["os"]

    #  shared assigns and PWA button handler delegated to a LiveComponent
    {:cont,
     socket
     |> assign(:max, @max)
     |> assign(:user_id, user_id)
     #  async push the user token to the client to setup cusstom userSocket
     |> push_event("access-token-ready", %{
       "user_token" => session["user_token"],
       "user_id" => user_id
     })
     |> assign(:os, os)
     |> assign(:update_available, false)
     |> attach_hook(:active, :handle_params, &handle_path_params/3)
     |> attach_hook(:sw, :handle_event, &handle_pwa_event/3)}
  end

  def on_mount(:ensure_authenticated, _params, _session, socket) do
    {:halt, redirect(socket, to: ~p"/")}
  end

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
