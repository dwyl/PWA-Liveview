# defmodule SolidyjsWeb.CounterLive do
#   use SolidyjsWeb, :live_view
#   alias Phoenix.PubSub
#   # import SolidyjsWeb.CoreComponents, only: [icon: 1]
#   use Phoenix.Component
#   alias SolidyjsWeb.Menu
#   require Logger

#   @impl true
#   def render(assigns) do
#     ~H"""
#     <div>
#       <%!-- <div id="pwaHook" phx-hook="PwaHook">
#         <button
#           class="px-4 mb-4 py-2 border-2 rounded-md text-midnightblue bg-bisque hover:text-bisque hover:bg-midnightblue transition-colors duration-300"
#           id="refresh-btn"
#           phx-click="accept-refresh"
#         >
#           Refresh needed
#         </button>
#       </div> --%>
#       <Menu.display />
#       <h1 class="mt-4 mb-4 text-2xl text-gray-600">LiveView</h1>
#       <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
#       <p class="text-sm text-gray-600 mt-4 mb-2">Remaing stock: {@global_stock}</p>
#       <hr />
#       <br />
#       <div id="solid" phx-hook="SolYHook" phx-update="ignore"></div>
#     </div>
#     """
#   end

#   @impl true
#   def mount(_params, session, socket) do
#     # set by "set_user_id" plug
#     %{"user_id" => user_id} = session

#     if connected?(socket) do
#       :ok = PubSub.subscribe(:pubsub, "stock")
#     end

#     max = 20
#     # get or set
#     {global_stock, version} =
#       case :ets.lookup(:app_state, :global_stock) do
#         [{:global_stock, stock, ver}] ->
#           {stock, ver}

#         _ ->
#           :ets.insert(:app_state, {:global_stock, max, 1})
#           {max, 1}
#       end

#     dbg({global_stock, version})

#     {:ok,
#      socket
#      |> assign(%{
#        global_stock: global_stock,
#        user_id: user_id,
#        version: version
#      })
#      |> push_event("new user", %{
#        user_id: user_id,
#        global_stock: global_stock,
#        max: max,
#        version: version
#      })}
#   end

#   # see also on_mount {Module, :default}: https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html#on_mount/1

#   @impl true
#   # receive stock state from new conntections
#   def handle_event("yjs-stock", %{"c" => client_stock}, socket) do
#     [{:global_stock, server_stock, server_version}] =
#       :ets.lookup(:app_state, :global_stock)

#     client_version = Map.get(socket.assigns, :version, 1)

#     dbg(
#       {client_version > server_version,
#        client_version == server_version and
#          client_stock < server_stock, client_version < server_version}
#     )

#     cond do
#       # Prefer newer versions
#       client_version > server_version ->
#         new_stock = min(client_stock, server_stock)
#         new_version = client_version
#         :ets.insert(:app_state, {:global_stock, new_stock, new_version})
#         broadcast_update(new_stock, new_version, socket.assigns.user_id)
#         {:noreply, assign(socket, global_stock: new_stock, version: new_version)}

#       client_version == server_version and client_stock < server_stock ->
#         new_version = server_version + 1
#         :ets.insert(:app_state, {:global_stock, client_stock, new_version})
#         broadcast_update(client_stock, new_version, socket.assigns.user_id)
#         {:noreply, assign(socket, %{global_stock: client_stock, version: new_version})}

#       # Client is out of sync - force update
#       client_version < server_version ->
#         send(self(), {:force_client_sync, server_stock, server_version})
#         {:noreply, socket}

#       true ->
#         {:noreply, socket}
#     end
#   end

#   def handle_event("stock-sync", %{"c" => client_stock}, socket) do
#     # Get current server stock
#     [{:global_stock, server_stock, server_version}] = :ets.lookup(:app_state, :global_stock)

#     # Take minimum of client and server stock
#     new_stock = min(client_stock, server_stock)

#     # Update server if client had lower value
#     if client_stock < server_stock do
#       new_version = server_version + 1
#       :ets.insert(:app_state, {:global_stock, new_stock, new_version})
#       broadcast_update(new_stock, new_version, socket.assigns.user_id)
#       {:noreply, assign(socket, %{global_stock: new_stock, version: new_version})}
#     else
#       {:noreply, socket}
#     end
#   end

#   # if user is not logged in, redirect to home
#   def handle_event("stock", %{"user_id" => nil} = _map, socket) do
#     {:noreply, push_navigate(socket, to: "/", replace: true)}
#   end

#   def handle_event("stock", %{"user_id" => userid, "c" => c}, socket) do
#     if socket.assigns.user_id == String.to_integer(userid) do
#       new_version = socket.assigns.version + 1
#       :ets.insert(:app_state, {:global_stock, c, new_version})
#       broadcast_update(c, new_version, socket.assigns.user_id)

#       {:noreply, assign(socket, %{global_stock: c, version: new_version})}
#     else
#       {:noreply, socket}
#     end
#   end

#   def handle_event("offline ready", %{"msg" => msg}, socket) do
#     {:noreply, put_flash(socket, :info, msg)}
#   end

#   def handle_event("accept-refresh", _, socket) do
#     {:noreply, push_event(socket, "refreshed", %{})}
#   end

#   @impl true
#   def handle_info({:new_stock, %{c: c, v: version, from_user_id: from_user_id}}, socket) do
#     # Ignore user's own broadcast
#     if socket.assigns.user_id != String.to_integer(from_user_id) do
#       :ets.insert(:app_state, {:global_stock, c, version})

#       {:noreply,
#        socket
#        |> assign(:global_stock, c)
#        |> assign(:version, version)
#        |> push_event("new_stock", %{c: c, v: version})}
#     else
#       {:noreply, socket}
#     end
#   end

#   def handle_info({:force_client_sync, stock, version}, socket) do
#     {:noreply, push_event(socket, "force_sync", %{c: stock, v: version})}
#   end

#   defp broadcast_update(value, version, user_id) do
#     :ok =
#       PubSub.broadcast(
#         :pubsub,
#         "stock",
#         {:new_stock,
#          %{
#            c: value,
#            v: version,
#            from_user_id: Integer.to_string(user_id)
#          }}
#       )
#   end
# end
