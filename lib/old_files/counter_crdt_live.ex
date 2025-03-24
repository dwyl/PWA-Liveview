# defmodule SolidyjsWeb.CounterCRDTLive do
#   use SolidyjsWeb, :live_view
#   alias Phoenix.PubSub
#   alias Solidyjs.YStore
#   alias SolidyjsWeb.Menu
#   require Logger

#   @doc_id "stock"
#   @max 20

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
#       <%!-- <p class="text-sm text-gray-600 mt-4 mb-2">Remaing stock: {@global_stock}</p> --%>
#       <hr />
#       <br />
#       <div id="solid" phx-hook="SolYHook" phx-update="ignore" data-userId={@user_id}></div>
#     </div>
#     """
#   end

#   @impl true
#   def mount(_params, session, socket) do
#     %{"user_id" => user_id} = session

#     if connected?(socket) do
#       :ok = PubSub.subscribe(:pubsub, @doc_id)
#       :load_initial_state = send(self(), :load_initial_state)
#     end

#     {:ok, assign(socket, %{user_id: user_id, seq: 0, max: @max})}
#   end

#   @impl true
#   def handle_event("y_delta", %{"update" => base64}, socket) do
#     binary = Base.decode64!(base64)
#     dbg({base64, binary})
#     new_seq = socket.assigns.seq + 1

#     YStore.store_delta(
#       @doc_id,
#       new_seq,
#       binary,
#       socket.assigns.user_id
#     )
#     |> dbg()

#     YStore.store_snapshot(@doc_id, binary)

#     PubSub.broadcast(:pubsub, @doc_id, {:y_delta, binary, socket.assigns.user_id})
#     {:noreply, assign(socket, seq: new_seq)}
#   end

#   @impl true
#   def handle_info(:load_initial_state, socket) do
#     # Get full document state
#     snapshot = YStore.get_snapshot(@doc_id)
#     deltas = YStore.get_deltas(@doc_id, socket.assigns.seq)

#     latest_seq = socket.assigns.seq + length(deltas)

#     payload = %{
#       # Ensure state is always a string
#       state: snapshot || nil,
#       deltas: deltas,
#       seq: latest_seq,
#       max: 20
#     }

#     dbg({payload, socket.assigns.user_id})

#     {:noreply,
#      socket
#      |> assign(seq: latest_seq)
#      |> push_event("y_init", payload)}
#   end

#   def handle_info({:y_delta, binary, origin_user_id}, socket) do
#     # Only push to client if not the origin
#     if origin_user_id != socket.assigns.user_id do
#       {:noreply, push_event(socket, "y_patch", %{delta: Base.encode64(binary)})}
#     else
#       {:noreply, socket}
#     end
#   end
# end
