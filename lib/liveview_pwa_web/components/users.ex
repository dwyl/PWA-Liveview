defmodule LiveviewPwaWeb.Users do
  use Phoenix.Component

  attr :user_id, :string, required: true
  attr :presence_list, :list, required: true

  def display(assigns) do
    ~H"""
    <div>
      <br/>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID:
      <span
        class="inline-flex items-center px-2 py-1 text-xs font-medium border border-blue-500 text-blue-500 rounded-full"
      >{@user_id}</span>
      </p>
      <%!-- <p class="text-sm text-gray-600 mt-4 mb-4">Online users: {inspect(@presence_list)}</p> --%>
      <%!-- <p class="text-sm text-gray-600 mt-4 mb-4">Online users: :for={user<- @presence_list</p> --%>
      <p class="text-sm text-gray-600 mt-4 mb-4"
      ><span>{length(@presence_list)}</span> Online user(s): &nbsp
        <span
          :for={user<- @presence_list}
          class={[
          if(user !== to_string(@user_id), do: "bg-green-200", else: nil),
          "inline-flex items-center px-2 py-1 text-xs font-medium border border-blue-500 text-blue-500 rounded-full"
          ]}
          >{user}
        </span>
      </p>
      <br />
    </div>
    """
  end
end
