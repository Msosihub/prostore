// No secrets, database access, redirect following or retries.
async function checkLocalHealth(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl("http://127.0.0.1:3100/api/health/live", {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw Error("Liveness failed");
  // Fixed tiny response; bound consumption even on an accidental wrong listener.
  const reader = response.body?.getReader();
  if (!reader) throw Error("Liveness failed");
  let text = "",
    bytes = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 128) {
        await reader.cancel();
        throw Error("Liveness failed");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  if (JSON.parse(text).status !== "ok") throw Error("Liveness failed");
  return { live: true, databaseVerified: false, providersVerified: false };
}
module.exports = { checkLocalHealth };
if (require.main === module)
  checkLocalHealth()
    .then((r) => console.log(JSON.stringify(r)))
    .catch(() => {
      console.error("Local application liveness unavailable");
      process.exitCode = 1;
    });
