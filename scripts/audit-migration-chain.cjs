// Offline SQL replay against this script's disposable container only. No URL input.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const name = `prostore-migration-audit-${randomUUID()}`;
const args = ["-H", "unix:///var/run/docker.sock"];
const docker = (a) =>
  execFileSync("docker", [...args, ...a], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const files = fs
  .readdirSync(path.join(root, "prisma/migrations"))
  .filter((n) =>
    fs.existsSync(path.join(root, "prisma/migrations", n, "migration.sql")),
  )
  .sort();
const migrations = files.map((name) => {
  const sql = fs.readFileSync(
    path.join(root, "prisma/migrations", name, "migration.sql"),
    "utf8",
  );
  return { name, sql, sha256: createHash("sha256").update(sql).digest("hex") };
});
function sql(db, input) {
  return spawnSync(
    "docker",
    [
      ...args,
      "exec",
      "-i",
      name,
      "psql",
      "-X",
      "-At",
      "-U",
      "postgres",
      "-d",
      db,
      "-v",
      "ON_ERROR_STOP=1",
      "-v",
      "VERBOSITY=verbose",
    ],
    { input, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
}
function replay(db, continueAfterFailure) {
  docker(["exec", name, "createdb", "-U", "postgres", db]);
  const results = [];
  for (const migration of migrations) {
    const r = sql(db, `BEGIN;\n${migration.sql}\nCOMMIT;`);
    const error = (r.stderr || "").match(/ERROR:\s+([A-Z0-9]{5}):\s+([^\n]+)/);
    results.push({
      name: migration.name,
      sha256: migration.sha256,
      passed: r.status === 0,
      ...(r.status !== 0
        ? {
            sqlstate: error?.[1] ?? "UNKNOWN",
            diagnostic: error?.[2]?.slice(0, 240) ?? "DDL replay failed",
          }
        : {}),
    });
    if (r.status !== 0 && !continueAfterFailure) break;
  }
  return results;
}
let started = false;
try {
  docker([
    "run",
    "--rm",
    "--network",
    "none",
    "-d",
    "--name",
    name,
    "--label",
    "prostore.disposable-migration-audit=true",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "-e",
    "POSTGRES_PASSWORD=local-test-only",
    "postgres:16-alpine",
  ]);
  started = true;
  // No published port: PostgreSQL is reachable only through docker exec.
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      docker(["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]);
      ready = true;
      break;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  if (!ready) throw Error("Disposable database failed to start");
  const strict = replay("chain_strict", false);
  const diagnostic = strict.some((r) => !r.passed)
    ? replay("chain_diagnostic", true)
    : strict;
  const catalog = sql(
    "chain_strict",
    "SELECT json_agg(row_to_json(c)) FROM (SELECT table_name, column_name, is_nullable, data_type FROM information_schema.columns WHERE table_schema = 'public') c;",
  );
  if (catalog.status !== 0) throw Error("Schema inventory failed");
  const match = catalog.stdout.match(/\[\{[\s\S]*\}\]/);
  const columns = JSON.parse(match?.[0] ?? "[]");
  const enumResult = sql(
    "chain_strict",
    "SELECT COALESCE(json_agg(t.typname), '[]') FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e';",
  );
  if (enumResult.status !== 0) throw Error("Enum inventory failed");
  const enumNames = JSON.parse(enumResult.stdout.trim());
  const generatedPath = path.join(
    root,
    "node_modules/.cache/prostore-payment-tests/client",
  );
  if (!fs.existsSync(generatedPath))
    throw Error(
      "Generate the established isolated fixture client first; no engine download is attempted here",
    );
  const generatedSchema = fs
    .readFileSync(path.join(generatedPath, "schema.prisma"), "utf8")
    .replace(/generator client \{[\s\S]*?\}/, "");
  const sourceSchema = fs
    .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
    .replace(/generator client \{[\s\S]*?\}/, "");
  if (generatedSchema.replace(/\s/g, "") !== sourceSchema.replace(/\s/g, ""))
    throw Error(
      "Fixture client schema is stale: run the isolated PostgreSQL harness first",
    );
  const models = require(generatedPath).Prisma.dmmf.datamodel.models;
  const critical = new Set([
    "User",
    "Product",
    "ProductPricing",
    "Cart",
    "Order",
    "OrderItem",
    "Supplier",
    "SupplierLedger",
    "ReturnRequest",
    "OrderItemEvent",
    "OrderDeliveryFeedback",
    "PaymentAttempt",
    "PaymentAttemptEvent",
    "OrderNotification",
    "OrderNotificationEvent",
    "MarketThread",
    "MarketMessage",
    "MarketProposal",
    "OtpThrottle",
    "MoneyReviewCase",
    "MoneyReviewEvent",
  ]);
  const drift = models.flatMap((model) => {
    const table = model.dbName || model.name;
    const actual = columns.filter((c) => c.table_name === table);
    if (!actual.length)
      return [
        {
          model: model.name,
          table,
          critical: critical.has(model.name),
          issue: "missing_table",
        },
      ];
    return model.fields
      .filter((f) => f.kind !== "object")
      .flatMap((field) => {
        const column = actual.find(
          (c) => c.column_name === (field.dbName || field.name),
        );
        if (!column)
          return [
            {
              model: model.name,
              column: field.name,
              critical: critical.has(model.name),
              issue: "missing_column",
            },
          ];
        if (!field.isList && field.isRequired && column.is_nullable === "YES")
          return [
            {
              model: model.name,
              column: field.name,
              critical: critical.has(model.name),
              issue: "nullable_required_column",
            },
          ];
        return [];
      });
  });
  // The JS-engine runtime DMMF omits enum definitions; read names from the matched schema.
  const enumDefinitions = [
    ...sourceSchema.matchAll(/enum\s+(\w+)\s*\{([\s\S]*?)\}/g),
  ].map((m) => ({ name: m[1], dbName: m[2].match(/@@map\("([^"]+)"\)/)?.[1] }));
  const enumDrift = enumDefinitions
    .filter((e) => !enumNames.includes(e.dbName || e.name))
    .map((e) => ({
      enum: e.name,
      critical: ["OrderItemStatus", "ReturnRequestStatus"].includes(e.name),
      issue: "missing_enum",
    }));
  console.log(
    JSON.stringify(
      {
        scope: "empty_disposable_postgresql16_sql_replay_not_prisma_deploy",
        migrationCount: migrations.length,
        strict,
        diagnostic,
        runtimeShapeDrift: drift,
        enumDrift,
        diagnosticWarning:
          "Failed files roll back; subsequent results are conditional diagnostics, not a deployable baseline.",
      },
      null,
      2,
    ),
  );
  if (
    strict.some((r) => !r.passed) ||
    drift.some((r) => r.critical) ||
    enumDrift.some((r) => r.critical)
  )
    process.exitCode = 2;
} finally {
  if (started) docker(["stop", "--time", "2", name]);
}
