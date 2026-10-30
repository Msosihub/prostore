// Ubuntu-only loopback transport. No install, schedule or credentials are created.
const { invokeWorker } = require("./invoke-worker.cjs");
async function invokeLocalWorker({
  queue,
  invoke = false,
  secret,
  fetchImpl = globalThis.fetch,
}) {
  const result = await invokeWorker({
    queue,
    invoke,
    secret,
    fetchImpl: (url, options) => {
      const expected = `https://nimboya.com/api/internal/workers/${queue}`;
      if (url !== expected) throw Error("Unexpected worker target");
      return fetchImpl(
        `http://127.0.0.1:3100/api/internal/workers/${queue}`,
        options,
      );
    },
  });
  return invoke
    ? result
    : {
        ...result,
        target: `http://127.0.0.1:3100/api/internal/workers/${queue}`,
      };
}
module.exports = { invokeLocalWorker };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (!(args.length === 1 || (args.length === 2 && args[1] === "--invoke"))) {
    console.error(
      "Usage: node scripts/invoke-local-worker.cjs <payments|orders|sellers> [--invoke]",
    );
    process.exitCode = 1;
  } else
    invokeLocalWorker({
      queue: args[0],
      invoke: args[1] === "--invoke",
      secret: process.env.NIMBOYA_WORKER_SECRET,
    })
      .then((result) => console.log(JSON.stringify(result)))
      .catch(() => {
        console.error(
          "Worker outcome unconfirmed; inspect durable queue state before retry",
        );
        process.exitCode = 1;
      });
}
