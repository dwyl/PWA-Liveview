defmodule LiveviewPwaWeb.Users do
  use Phoenix.Component

  attr :user_id, :string, required: true
  attr :presence_list, :list, required: true

  def display(assigns) do
    ~H"""
    <div>
      <br/>
      <p class="text-sm text-gray-600 mt-4 mb-2">User ID: {@user_id}</p>
      <p class="text-sm text-gray-600 mt-4 mb-4">Online users: {inspect(@presence_list)}</p>
      <br />
    </div>
    """
  end
end
