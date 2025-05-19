export async function checkServer() {
  try {
    const response = await fetch("/api/connectivity", {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch (err) {
    console.error(
      `Connectivity check failed: ${
        err.name === "AbortError" ? "timeout" : err.message
      }`
    );
    return false;
  }
}
