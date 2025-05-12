defmodule LiveviewPwaWeb.CircularProgress do
  use Phoenix.Component

  @moduledoc """
  A circular progress component that displays a circular progress bar
  with a percentage label in the center.
  """

  attr :progress, :float, required: true
  attr :color, :string, default: "#f77a52"
  attr :width, :integer, default: 60
  attr :height, :integer, default: 60

  def render(assigns) do
    assigns = assign(assigns, :offset, 100 - assigns.progress)

    ~H"""
    <svg class="transform -rotate-90" width={@width} height={@height} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="60" r="54" fill="none" stroke="#e6e6e6" stroke-width="12" />
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke={@color}
        stroke-width="12"
        stroke-linecap="round"
        style={"stroke-dasharray: 100; stroke-dashoffset: #{@offset};"}
        pathLength="100"
      />
      <text
        x="60"
        y="60"
        text-anchor="middle"
        dominant-baseline="middle"
        class="text-gray-900 font-bold"
        font-size="20"
      >
        {@progress}%
      </text>
    </svg>
    """
  end
end
