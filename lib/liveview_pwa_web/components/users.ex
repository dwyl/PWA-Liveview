defmodule LiveviewPwaWeb.Users do
  use Phoenix.Component

  attr :user_id, :string, required: true
  attr :module_id, :string, required: true

  def display(assigns) do
    ~H"""
    <div>
      <br />
      <p class="text-sm text-gray-600 mt-4 mb-2">
        User ID:
        <span
          id="user-id"
          class="inline-flex items-center px-2 py-1 text-xs font-medium border border-midnightblue text-midnightblue rounded-full"
        >
          {@user_id}
        </span>
      </p>
      <p id={@module_id} phx-update="ignore"></p>
      <br />
    </div>
    """
  end
end

# <p class="text-sm text-gray-600 mt-4 mb-4" phx-update="stream" id="users">
#   {inspect(@users)}
#   <span>{length(@users)}</span>
#   Online user(s): &nbsp
#   <span
#     :for={{dom_id, user} <- @users}
#     id={dom_id}
#     class={[
#       if(user !== to_string(@user_id), do: "bg-green-200", else: nil),
#       "inline-flex items-center px-2 py-1 text-xs font-medium border border-blue-500 text-blue-500 rounded-full"
#     ]}
#   >
#     {inspect(user)}
#   </span>
# </p>
