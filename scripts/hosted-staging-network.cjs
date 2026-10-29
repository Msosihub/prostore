const { assertStaging, HOST } = require("./hosted-staging-guard.cjs");
let installed = false;
function install() {
  assertStaging();
  if (installed) return;
  installed = true;
  const allowed = new Set(
    ["localhost", "127.0.0.1", "::1", process.env.VERCEL_URL].filter(Boolean),
  );
  const original = global.fetch;
  global.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string" ? input : input.url || String(input),
    );
    if (
      process.env.PROSTORE_STAGING_BROWSER_REHEARSAL === "1" &&
      global[Symbol.for("prostore.synthetic.transport")] === true &&
      ["zenoapi.com", "api.africastalking.com"].includes(url.hostname)
    )
      return original(input, init);
    if (!allowed.has(url.hostname))
      throw Error("External HTTP disabled in hosted synthetic staging");
    return original(input, init);
  };
  for (const transport of [require("node:http"), require("node:https")]) {
    const request = transport.request;
    transport.request = function (...args) {
      const x = args[0];
      const opts = typeof x === "string" || x instanceof URL ? new URL(x) : x;
      const host = opts.hostname || opts.host || "localhost";
      const override = args[1] && typeof args[1] === "object" ? args[1] : {};
      if (
        override.socketPath ||
        opts.socketPath ||
        !allowed.has(override.hostname || override.host || host)
      )
        throw Error("External HTTP disabled in hosted synthetic staging");
      return request.apply(this, args);
    };
    transport.get = function (...args) {
      const req = transport.request(...args);
      req.end();
      return req;
    };
  }
  const net = require("node:net"),
    connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const target = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host =
      typeof target === "object"
        ? target.host || target.hostname || "localhost"
        : typeof args[1] === "string"
          ? args[1]
          : "localhost";
    const port = Number(typeof target === "object" ? target.port : target);
    if (
      (typeof target === "object" && target.path) ||
      (typeof target === "string" && !/^\d+$/.test(target)) ||
      (!allowed.has(host) && !(host === HOST && port === 5432))
    )
      throw Error("External socket disabled in hosted synthetic staging");
    return connect.apply(this, args);
  };
}
module.exports = { install };
if (process.env.PROSTORE_STAGING_NETWORK_PRELOAD === "1") install();
