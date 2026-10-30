// One-shot trusted operator caller. No schedule, credentials, retries or DB access.
const queues = new Set(["payments", "orders", "sellers"]);
async function invokeWorker({
  queue,
  invoke = false,
  secret,
  fetchImpl = globalThis.fetch,
}) {
  if (!queues.has(queue) || typeof invoke !== "boolean")
    throw Error("Invalid worker options");
  const url = `https://nimboya.com/api/internal/workers/${queue}`;
  if (!invoke) return { networkRequest: false, queue, target: url };
  if (typeof secret !== "string" || secret.length < 32 || secret.length > 256)
    throw Error("Worker authentication is not configured");
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      redirect: "error",
      signal: AbortSignal.timeout(65000),
      cache: "no-store",
    });
    if (!response.ok) throw Error("Worker failed");
    // Bound response consumption; never print a raw response or provider error.
    const reader = response.body?.getReader();
    if (!reader) throw Error("Missing result");
    let text = "",
      bytes = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) {
          await reader.cancel();
          throw Error("Oversized result");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const result = JSON.parse(text);
    if (
      result.queue !== queue ||
      !["dry-run", "execute"].includes(result.mode) ||
      !Number.isInteger(result.examined) ||
      result.examined < 0 ||
      result.examined > 1
    )
      throw Error("Invalid result");
    return {
      networkRequest: true,
      queue,
      mode: result.mode,
      examined: result.examined,
    };
  } catch {
    throw Error(
      "Worker outcome unconfirmed; inspect durable queue state before retry",
    );
  }
}
module.exports = { invokeWorker };
if (require.main === module) {
  const args = process.argv.slice(2);
  const valid =
    args.length === 1 || (args.length === 2 && args[1] === "--invoke");
  if (!valid) {
    console.error(
      "Usage: node scripts/invoke-worker.cjs <payments|orders|sellers> [--invoke]",
    );
    process.exitCode = 1;
  } else
    invokeWorker({
      queue: args[0],
      invoke: args.length === 2,
      secret: process.env.NIMBOYA_WORKER_SECRET,
    })
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
}
