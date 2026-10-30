// Creates and destroys only its own disposable database. Never consumes DATABASE_URL.
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const dockerArgs = ["-H", "unix:///var/run/docker.sock"];
const docker = (args) =>
  execFileSync("docker", [...dockerArgs, ...args], { encoding: "utf8" }).trim();
const name = `prostore-payment-test-${randomUUID()}`;
const cache = path.join(root, "node_modules/.cache/prostore-payment-tests");
fs.mkdirSync(cache, { recursive: true });
const clientPath = path.join(cache, "client");
const schema = fs
  .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
  .replace(
    /generator client \{[\s\S]*?\}/,
    `generator client {\n provider = "prisma-client-js"\n engineType = "client"\n output = "${clientPath}"\n}`,
  );
fs.writeFileSync(path.join(cache, "schema.prisma"), schema);
let started = false;
try {
  // Localhost-only port, disposable data, no host filesystem mounts.
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "--label",
    "prostore.disposable-payment-test=true",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "-p",
    "127.0.0.1::5432",
    "-e",
    "POSTGRES_PASSWORD=local-test-only",
    "-e",
    "POSTGRES_DB=prostore_payment_test",
    require("./postgres-test-image.cjs")(),
  ]);
  started = true;
  const binding = docker(["port", name, "5432/tcp"]);
  if (!/^127\.0\.0\.1:\d+$/.test(binding))
    throw new Error("Unsafe test database binding");
  const url = `postgresql://postgres:local-test-only@${binding}/prostore_payment_test`;
  // Explicitly override database/provider variables; runtime provider calls are mocked.
  const env = {
    ...process.env,
    DATABASE_URL: url,
    PROSTORE_TEST_DATABASE_URL: url,
    PROSTORE_TEST_CLIENT: clientPath,
    ZENOPAY_API_KEY: "",
    AT_API_KEY: "",
    PROSTORE_TEST_HISTORICAL_CHAIN: process.argv.includes("--historical-chain") ? "1" : "",
    PROSTORE_BACKUP_FIXTURE: process.argv.includes("--backup-restore") ? "1" : "",
    PRISMA_SCHEMA_ENGINE_BINARY: "/bin/true",
    PRISMA_QUERY_ENGINE_LIBRARY: "/bin/true",
  };
  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "generate",
      "--schema",
      path.join(cache, "schema.prisma"),
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/jest/bin/jest.js",
      "--config",
      "jest.integration.config.js",
      "--runInBand",
    ],
    { cwd: root, env, stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
  if (result.status === 0 && process.argv.includes("--backup-restore")) {
    const report = require("./verify-disposable-restore.cjs").verifyRestore(name);
    if (process.argv.includes("--historical-chain")) report.scope = "disposable_historical_migration_chain_with_synthetic_records";
    console.log("PASS disposable backup/restore:", JSON.stringify(report));
  }
} finally {
  if (started) docker(["stop", "--time", "2", name]);
}
