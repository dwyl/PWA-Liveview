/**
 * Checks server connectivity by making a HEAD request to the connectivity endpoint.
 * Returns true if the server is reachable and responds successfully, false otherwise.
 * Logs any network errors to the console for debugging purposes.
 *
 * @async
 * @function checkServer
 * @returns {Promise<boolean>} True if server is online and reachable, false if offline or unreachable
 *
 * @description
 * This utility function performs a minimal server connectivity check:
 * 1. Makes a HEAD request to "/api/connectivity" (no response body needed)
 * 2. Uses "no-store" cache policy to ensure fresh connectivity status
 * 3. Returns true for any successful HTTP response (2xx status codes)
 * 4. Returns false for network errors, timeouts, or HTTP error responses
 * 5. Logs errors to console for debugging network issues
 *
 * The HEAD method is used to minimize bandwidth usage while still verifying
 * that the server is accessible and responding to requests.
 *
 * @example
 * // Use in conditional logic
 * setInterval(async () => {
 * const isOnline = await checkServer();
 *   return updateConnectionStatus(isOnline)
 * }, interval)
 *
 */
export async function checkServer() {
  try {
    const response = await fetch("/api/connectivity", {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}
