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
function run(label, args, env = process.env, executable = process.execPath) {
  console.log("START " + label);
  const result = cp.spawnSync(executable, args, {
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
  const prefix = `const fs=require('node:fs'),path=require('node:path');\nrequire('../../scripts/hosted-staging-guard.cjs').assertStaging();\nconst url=process.env.DATABASE_URL;\nconst generated=require(process.env.PROSTORE_TEST_CLIENT);\nconst prisma=new generated.PrismaClient({datasourceUrl:url,errorFormat:'minimal'});\n`;
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
      PROSTORE_TEST_CLIENT: path.resolve("node_modules/.prisma/client"),
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
    run(
      "hosted browser dependencies",
      ["ci", "--prefix", "tests/hosted", "--include=dev", "--ignore-scripts"],
      process.env,
      "npm",
    );
    const route = path.join("app", "qa-loading");
    fs.mkdirSync(route, { recursive: true });
    fs.writeFileSync(
      path.join(route, "page.tsx"),
      `import {Suspense} from 'react';import ShoppingLoading from '@/components/storefront/shopping-loading';export const dynamic='force-dynamic';async function Slow(){await new Promise(r=>setTimeout(r,45000));return <p>DEMO loading complete</p>;}export default function Page(){return <Suspense fallback={<ShoppingLoading/>}><Slow/></Suspense>}`,
    );
    // Throwaway diagnostic: expose only error type/code, never arguments or contacts.
    const actionFile = "lib/actions/order.actions.ts";
    const actionSource = fs.readFileSync(actionFile, "utf8");
    const marker = '  } catch {\n    return { success: false, message: "Imeshindikana kuthibitisha delivery." };';
    if (!actionSource.includes(marker)) throw Error("Delivery diagnostic anchor changed");
    fs.writeFileSync(actionFile, actionSource.replace(marker,
      '  } catch (error) {\n    console.error("HOSTED_DIAG_DELIVERY", error instanceof Error ? error.name : "unknown", typeof error === "object" && error && "code" in error ? String(error.code) : "no-code");\n    return { success: false, message: "Imeshindikana kuthibitisha delivery." };'));
    run("native full Next build", ["node_modules/next/dist/bin/next", "build"]);
    run("native browser workflow rehearsal", [
      "scripts/hosted-staging-browser.cjs",
    ]);
  } finally {
    fs.writeFileSync(file, original);
  }
})().catch(() => {
  console.error(
    "Hosted staging rehearsal stopped. No production target was used. See the redacted phase result above.",
  );
  process.exitCode = 1;
});
