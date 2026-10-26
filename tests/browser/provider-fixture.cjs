const fs = require("fs");
const original = global.fetch;
global.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string" ? input : input.url || String(input),
  );
  if (["127.0.0.1", "localhost"].includes(url.hostname))
    return original(input, init);
  if (url.hostname === "api.africastalking.com")
    return Response.json({ success: true });
  if (url.hostname === "zenoapi.com") {
    const file = require("path").join(__dirname, "payments.json");
    const state = JSON.parse(fs.readFileSync(file));
    if (init.method === "POST") {
      const b = JSON.parse(init.body);
      state.orders[b.order_id] = { amount: b.amount, status: "PENDING" };
      state.collections++;
      fs.writeFileSync(file, JSON.stringify(state));
      if (state.interruptNext) {
        state.interruptNext = false;
        fs.writeFileSync(file, JSON.stringify(state));
        throw new Error("Synthetic interrupted collection response");
      }
      return Response.json({
        status: "success",
        resultcode: "000",
        order_id: b.order_id,
      });
    }
    const id = url.searchParams.get("order_id");
    const p = state.orders[id];
    return Response.json({
      resultcode: "000",
      data: p
        ? [
            {
              order_id: id,
              amount: p.amount,
              payment_status: p.status,
              reference: `fixture-${id}`,
            },
          ]
        : [],
    });
  }
  throw new Error("External network disabled in disposable staging");
};
for (const mod of ["http", "https"]) {
  const m = require(mod),
    orig = m.request;
  m.request = function (...args) {
    const a = args[0];
    const host =
      typeof a === "string"
        ? new URL(a).hostname
        : a.hostname || a.host || "localhost";
    if (!["localhost", "127.0.0.1", "::1"].includes(host))
      throw Error("External HTTP disabled in staging");
    return orig.apply(this, args);
  };
}

// Last-mile guard covers get(), URL/options overrides, TLS and direct TCP clients.
const net = require("node:net");
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const target = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host =
    typeof target === "object"
      ? target.host || target.hostname || "localhost"
      : typeof args[1] === "string"
        ? args[1]
        : "localhost";
  if (
    (typeof target === "object" && target.path) ||
    (typeof target === "string" && !/^\d+$/.test(target)) ||
    !["localhost", "127.0.0.1", "::1"].includes(host)
  )
    throw new Error("Non-loopback socket disabled in disposable staging");
  return connect.apply(this, args);
};
for (const mod of ["http", "https"]) {
  const transport = require(mod);
  transport.get = function (...args) {
    const request = transport.request(...args);
    request.end();
    return request;
  };
}
