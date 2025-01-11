// ProgressCircle.tsx
const ProgressCircle = (props) => {
  return (
    <svg
      class="transform -rotate-90"
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
        style={`stroke-dasharray: 100; stroke-dashoffset: ${props.offset};`}
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

// FileDownloader.tsx
import { createSignal, createResource, Component, For } from "solid-js";

const FileDownloader = () => {
  const [progress, setProgress] = createSignal(0);
  const [selectedValue, setSelectedValue] = createSignal("");

  const fetchData = async () => {
    const response = await fetch("your-api-endpoint");
    const reader = response.body?.getReader();
    const contentLength = +response.headers?.get("Content-Length");

    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;
      setProgress(Math.round((receivedLength / contentLength) * 100));
    }

    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    const text = new TextDecoder("utf-8").decode(allChunks);
    const rows = text.split("\n");
    const headers = rows[0].split(",");

    return rows.slice(1).map((row) => {
      const values = row.split(",");
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index]?.trim();
        return obj;
      });
    });
  };

  const [data] = createResource(fetchData);

  return (
    <div class="p-4 max-w-md mx-auto">
      <div class="mb-4">
        <button
          onClick={() => data.refetch()}
          disabled={data.loading}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {data.loading ? "Downloading..." : "Download Data"}
        </button>
      </div>

      {data.loading && (
        <div class="relative w-32 h-32 mx-auto mb-4">
          <ProgressCircle
            width={120}
            height={120}
            progress={progress()}
            color="#3b82f6"
            offset={100 - progress()}
          />
        </div>
      )}

      {data() && (
        <select
          value={selectedValue()}
          onChange={(e) => setSelectedValue(e.currentTarget.value)}
          class="w-full p-2 border rounded"
        >
          <option value="">Select an option</option>
          <For each={data()}>
            {(option) => (
              <option value={JSON.stringify(option)}>
                {Object.values(option).join(" - ")}
              </option>
            )}
          </For>
        </select>
      )}
    </div>
  );
};

export default FileDownloader;
