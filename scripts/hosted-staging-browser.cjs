const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  cp = require("node:child_process");
require("./hosted-staging-guard.cjs").assertStaging();
const chromium = require("../tests/hosted/node_modules/@sparticuz/chromium");
const root = process.cwd(),
  baseUrl = "http://127.0.0.1:3107";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nimboya-native-browser-"));
const stateFile = path.join(temp, "state.json");
let server;
const env = {
  ...Object.fromEntries(['PATH','HOME','TMPDIR','NODE_ENV','DATABASE_URL','AUTH_SECRET','AUTH_TRUST_HOST','VERCEL_PROJECT_ID','VERCEL_URL','PROSTORE_HOSTED_STAGING','SITE_NOINDEX','ZENOPAY_API_KEY','AT_API_KEY'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]])),
  PROSTORE_TEST_CLIENT: path.resolve("node_modules/.prisma/client"),
  PROSTORE_TEST_DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_SERVER_URL: baseUrl,
  AUTH_URL: baseUrl,
  PROSTORE_BROWSER_STATE: stateFile,
  NODE_PATH: path.resolve("tests/hosted/node_modules"),
  PROSTORE_STAGING_BROWSER_REHEARSAL: "1",
};
function run(file, extra = {}) {
  const result = cp.spawnSync(process.execPath, [file], {
    env: { ...env, ...extra },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  process.stdout.write((result.stdout || "") + (result.stderr || ""));
  if (result.status !== 0)
    throw Error("Hosted browser stage failed: " + path.basename(file));
}
(async () => {
  env.PROSTORE_CHROMIUM = await chromium.executablePath();
  env.PROSTORE_CHROMIUM_ARGS = JSON.stringify(chromium.args);
  env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH;
  Object.assign(process.env, {
    PROSTORE_TEST_CLIENT: env.PROSTORE_TEST_CLIENT,
  });
  const db = require("../tests/integration/database.cjs");
  await db.reset();
  await db.prisma.$disconnect();
  fs.writeFileSync(stateFile, JSON.stringify({ stage: root, env, baseUrl, publicOrigin: process.env.NEXT_PUBLIC_SERVER_URL }), {
    mode: 0o600,
  });
  run("tests/browser/seed.cjs", { NODE_OPTIONS: "" });
  fs.copyFileSync("tests/browser/provider-fixture.cjs", "provider-fixture.cjs");
  fs.writeFileSync(
    "payments.json",
    JSON.stringify({ orders: {}, collections: 0 }),
    { mode: 0o600 },
  );
  const log = fs.openSync(path.join(temp, "server.log"), "w");
  server = cp.spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3107",
    ],
    {
      env: {
        ...env,
        NODE_OPTIONS: "--require=" + path.join(root, "provider-fixture.cjs"),
      },
      stdio: ["ignore", log, log],
      detached: true,
    },
  );
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw Error("Native app exited before browser checks");
    try {
      const r = await fetch(baseUrl + "/api/auth/csrf");
      if (r.ok) break;
    } catch {}
    if (i === 119) throw Error("Native app startup timed out");
    await new Promise((r) => setTimeout(r, 500));
  }
  for (const name of [
    "storefront-seo",
    "credibility",
    "discovery",
    "flow",
    "cart",
    "payment",
    "delivery",
    "dispute",
    "chat",
    "multi-seller",
    "buy-now",
    "market-chat",
    "catalog-otp",
    "seller-shops",
  ])
    run("tests/browser/" + name + ".cjs", {
      NODE_OPTIONS: "--require=" + path.join(root, "tests/hosted/launch.cjs"),
    });
  console.log(
    "PASS all hosted native browser workflows with synthetic data and mocked providers",
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {}
    }
    fs.rmSync(stateFile, { force: true });
  });
