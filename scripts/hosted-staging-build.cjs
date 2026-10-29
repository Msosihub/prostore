// Only the approved empty/synthetic database is accepted. No production fallback.
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process");
const { assertStaging } = require("./hosted-staging-guard.cjs");
const url = assertStaging();
// Exclude legacy root key artifacts from the throwaway build and function tracing.
for (const name of ["abc", "abc.pub"]) fs.rmSync(name, { force: true });
const secrets = [
  process.env.DATABASE_URL,
  process.env.AUTH_SECRET,
  decodeURIComponent(url.password),
].filter(Boolean);
function redact(s) {
  for (const value of secrets) s = s.split(value).join("[REDACTED]");
  return s;
}
function run(label, args, env = process.env) {
  console.log("START " + label);
  const result = cp.spawnSync(process.execPath, args, {
    env,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  process.stdout.write(redact((result.stdout || "") + (result.stderr || "")));
  if (result.status !== 0) throw Error(label + " failed");
  console.log("PASS " + label);
}
(async () => {
  run("native Prisma migration deploy", [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
  ]);
  run("native Prisma generation", [
    "node_modules/prisma/build/index.js",
    "generate",
  ]);
  // Adapt the isolated harness only inside this throwaway build tree. Use native client;
  // the real migration engine above supplies schema rather than fixture SQL generation.
  const file = "tests/integration/database.cjs",
    original = fs.readFileSync(file, "utf8");
  const prefix = `const fs=require('node:fs'),path=require('node:path');\nrequire('../../scripts/hosted-staging-guard.cjs').assertStaging();\nconst url=process.env.DATABASE_URL;\nconst generated=require('@prisma/client');\nconst prisma=new generated.PrismaClient({datasourceUrl:url,errorFormat:'minimal'});\n`;
  let adapted = prefix + original.slice(original.indexOf("const models ="));
  const start = adapted.indexOf("async function prepare()"),
    end = adapted.indexOf("async function reset()");
  adapted =
    adapted.slice(0, start) +
    `async function prepare(){await prisma.$queryRawUnsafe('SELECT 1');}\n` +
    adapted.slice(end);
  fs.writeFileSync(file, adapted);
  try {
    const env = {
      ...process.env,
      PROSTORE_TEST_DATABASE_URL: process.env.DATABASE_URL,
      PROSTORE_TEST_CLIENT: path.resolve("node_modules/@prisma/client"),
      PROSTORE_BACKUP_FIXTURE: "1",
      PROSTORE_TEST_HISTORICAL_CHAIN: "",
      PROSTORE_STAGING_NETWORK_PRELOAD: "1",
      NODE_OPTIONS:
        "--require=" + path.resolve("scripts/hosted-staging-network.cjs"),
    };
    run(
      "native synthetic PostgreSQL regression",
      [
        "node_modules/jest/bin/jest.js",
        "--config",
        "jest.integration.config.js",
        "--runInBand",
      ],
      env,
    );
  } finally {
    fs.writeFileSync(file, original);
  }
  run("native full Next build", ["node_modules/next/dist/bin/next", "build"]);
})().catch(() => {
  console.error(
    "Hosted staging rehearsal stopped. No production target was used. See the redacted phase result above.",
  );
  process.exitCode = 1;
});
