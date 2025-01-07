export const ProgressCircle = (props) => {
  return (
    <svg
      // class="transform -rotate-90"
      width={props.width}
      height={props.height}
      viewBox="0 0 120 120"
    >
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="#e6e6e6"
        stroke-width="12"
      />
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke={props.color}
        stroke-width="12"
        stroke-linecap="round"
        style={`stroke-dasharray: 100; stroke-dashoffset: ${
          100 - props.progress
        };`}
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
        {props.progress}%
      </text>
    </svg>
  );
};
