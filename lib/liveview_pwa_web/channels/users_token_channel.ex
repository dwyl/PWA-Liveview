# defmodule LiveviewPwaWeb.UsersTokenChannel do
#   use Phoenix.Channel
#   require Logger

#   @impl true
#   def join("users_token:" <> user_id, _params, socket) do
#     if socket.assigns.user_id == user_id do
#       {:ok, socket}
#     else
#       {:error, %{"error" => "unauthorized", "user_id" => user_id}, socket}
#     end
#   end

#   @impl true
#   def handle_in("access-renewed", _params, socket) do
#     Logger.info("Access token renewed for user #{socket.assigns.user_id}")
#     push(socket, "access-renewed", %{user_id: socket.assigns.user_id})
#     {:noreply, socket}
#   end

#   def handle_in("disconnect", _params, socket) do
#     Logger.info("User #{socket.assigns.user_id} requested disconnection")
#     push(socket, "disconnect", %{user_id: socket.assigns.user_id})
#     {:stop, :expired, socket}
#   end

#   @impl true
#   def terminate(_reason, socket) do
#     Logger.info("User #{socket.assigns.user_id} disconnected from UsersTokenChannel")
#   end
# end
