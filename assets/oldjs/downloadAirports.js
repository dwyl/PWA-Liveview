// async function downloadAirports(url) {
//   const response = await fetch(url);

//   if (!response.ok) {
//     throw new Error(`HTTP error! Status: ${response.status}`);
//   }

//   // Get content length for progress calculation
//   const contentLength = response.headers.get("Content-Length");
//   if (!contentLength) {
//     console.warn("Content-Length not provided");
//     return;
//   }
//   const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

//   // Get the reader from the response body
//   const reader = response.body.getReader();

//   // Stream processing
//   const chunks = [];
//   let receivedBytes = 0;

//   const progressBar = document.getElementById("progress-bar"); // Assume an HTML progress element
//   progressBar.value = 0;

//   while (true) {
//     // Read the next chunk
//     const { done, value } = await reader.read();

//     // Exit the loop when no more data is available
//     if (done) break;

//     // Store the chunk
//     chunks.push(value);
//     receivedBytes += value.length;

//     // Update progress if content length is available
//     if (totalBytes) {
//       const progress = Math.round((receivedBytes / totalBytes) * 100);
//       console.log(`Downloaded: ${progress}%`);
//       if (progressBar) {
//         progressBar.value = progress;
//       }
//     } else {
//       console.log(`Downloaded ${receivedBytes} bytes so far.`);
//     }
//   }

//   const combined = new Uint8Array(
//     chunks.reduce((acc, chunk) => acc + chunk.length, 0)
//   );
//   let offset = 0;
//   for (const chunk of chunks) {
//     combined.set(chunk, offset);
//     offset += chunk.length;
//   }
//   console.log("Downloaded");
//   return combined.buffer; // Return as ArrayBuf
// }
