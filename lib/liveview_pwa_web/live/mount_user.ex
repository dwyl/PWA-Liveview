defmodule LiveviewPwaWeb.MountUser do
  import Phoenix.LiveView
  import Phoenix.Component
  require Logger

  @max 20

  @moduledoc """
  This module is used for shared features between the LiveView modules.
  in the same sesson.

  - assigns the user_id from the session into the socket
  - handle the shared PWA button delegated to a LC
  - handle the params to set the active path
  """

  def on_mount(
        :ensure_authenticated,
        _params,
        %{"user_id" => user_id, "user_agent" => %UAParser.UA{} = ua} = _session,
        socket
      ) do
    {:cont,
     socket
     #  shared assigns and PWA button handler delegated to a LiveComponent
     |> assign(:max, @max)
     |> assign(:user_id, user_id)
     |> assign(:os, set_ua(ua).os)
     |> assign(:update_available, false)
     |> attach_hook(:active, :handle_params, &handle_path_params/3)
     |> attach_hook(:sw, :handle_event, &handle_pwa_event/3)}
  end

  defp set_ua(ua) do
    %UAParser.UA{
      device: %UAParser.Device{family: device_familly},
      os: %UAParser.OperatingSystem{
        family: os_familly
      }
    } = ua

    %{os: os_familly, device_familly: device_familly} |> dbg()
  end

  defp handle_path_params(_params, url, socket) do
    path = URI.new!(url) |> Map.get(:path)
    {:halt, assign(socket, :active_path, path)}
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
