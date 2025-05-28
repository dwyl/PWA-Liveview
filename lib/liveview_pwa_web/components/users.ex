defmodule LiveviewPwaWeb.Users do
  use Phoenix.Component

  @moduledoc false

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
