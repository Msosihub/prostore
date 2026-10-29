// Called only by the disposable PostgreSQL harness; never accepts a database URL.
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
function verifyRestore(container) {
  if (!/^prostore-payment-test-[0-9a-f-]{36}$/.test(container))
    throw Error("Disposable container required");
  const docker = (args, options = {}) =>
    execFileSync("docker", ["-H", "unix:///var/run/docker.sock", ...args], {
      maxBuffer: 32 * 1024 * 1024,
      ...options,
    });
  const meta = JSON.parse(
    docker(["inspect", container], { encoding: "utf8" }),
  )[0];
  if (
    meta.Config.Labels?.["prostore.disposable-payment-test"] !== "true" ||
    !Object.prototype.hasOwnProperty.call(
      meta.HostConfig.Tmpfs || {},
      "/var/lib/postgresql/data",
    )
  )
    throw Error("Disposable tmpfs database required");
  const source = "prostore_payment_test",
    target = "prostore_restore_test";
  const psql = (db, sql) =>
    docker(
      [
        "exec",
        container,
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        db,
        "-At",
        "-c",
        sql,
      ],
      { encoding: "utf8" },
    ).trim();
  const dump = docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    source,
    "-Fc",
    "--no-owner",
    "--no-acl",
  ]);
  docker(["exec", container, "createdb", "-U", "postgres", target]);
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      target,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
    ],
    { input: dump },
  );
  const tables = [
    "User",
    "Product",
    "Order",
    "OrderItem",
    "Supplier",
    "SupplierLedger",
    "PaymentAttempt",
    "PaymentAttemptEvent",
    "OrderNotification",
    "OrderNotificationEvent",
    "AuditLog",
    "OrderDeliveryFeedback",
    "MoneyReviewCase",
    "MoneyReviewEvent",
    "SellerRegistration",
    "SellerNotice",
    "SellerNoticeEvent",
  ];
  const counts = {};
  for (const table of tables) {
    const sql = `SELECT count(*) || ':' || md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY row_to_json(t)::text),'')) FROM "${table}" t`;
    const before = psql(source, sql),
      after = psql(target, sql);
    if (before !== after) throw Error("Restored table mismatch: " + table);
    counts[table] = Number(before.split(":")[0]);
  }
  const schemaSql =
    "SELECT md5(string_agg(table_name||column_name||data_type||is_nullable||COALESCE(column_default,''), ',' ORDER BY table_name,ordinal_position)) FROM information_schema.columns WHERE table_schema='public'";
  if (psql(source, schemaSql) !== psql(target, schemaSql))
    throw Error("Restored schema mismatch");
  const constraints =
    "SELECT md5(string_agg(c.conrelid::regclass::text||pg_get_constraintdef(c.oid),',' ORDER BY c.conrelid::regclass::text,pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'";
  if (psql(source, constraints) !== psql(target, constraints))
    throw Error("Restored constraints mismatch");
  if (
    counts.PaymentAttempt < 1 ||
    counts.OrderNotification < 3 ||
    counts.AuditLog < 1 ||
    counts.SupplierLedger < 2 ||
    counts.OrderDeliveryFeedback < 1
  )
    throw Error("Required synthetic audit fixture absent");
  // Verify constraints remain active after restore, without altering durable fixture data.
  const uniqueness = psql(
    target,
    `SELECT count(*)=count(DISTINCT "eventKey") FROM "OrderNotification"`,
  );
  if (uniqueness !== "t")
    throw Error("Restored notification uniqueness mismatch");
  return {
    scope: "disposable_fixture_schema_only",
    dumpBytes: dump.length,
    dumpSha256: createHash("sha256").update(dump).digest("hex"),
    tablesCompared: tables.length,
    counts,
    schemaAndConstraintsMatch: true,
  };
}
module.exports = { verifyRestore };
