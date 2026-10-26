// Disposable UI-to-database staging. Never reads existing DATABASE_URL or credentials.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const cp = require("node:child_process");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const docker = (args) =>
  cp
    .execFileSync("docker", ["-H", "unix:///var/run/docker.sock", ...args], {
      encoding: "utf8",
    })
    .trim();
const run = (script, env) =>
  new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, [script], {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${path.basename(script)} failed (${code})`)),
    );
  });
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
(async () => {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "prostore-browser-"));
  const stateFile = path.join(stage, "state.json");
  const name = "prostore-browser-" + randomUUID();
  let started = false,
    server;
  try {
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
      "postgres:16-alpine",
    ]);
    started = true;
    const binding = docker(["port", name, "5432/tcp"]);
    if (!/^127\.0\.0\.1:\d+$/.test(binding))
      throw Error("Unsafe database binding");
    const url =
      "postgresql://postgres:local-test-only@" +
      binding +
      "/prostore_payment_test";
    const files = cp
      .execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
    for (const f of files) {
      if (
        f === "abc" ||
        f === "abc.pub" ||
        f.startsWith(".env") ||
        f.startsWith(".git")
      )
        continue;
      const to = path.join(stage, f);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(path.join(root, f), to);
    }
    fs.symlinkSync(
      path.join(root, "node_modules"),
      path.join(stage, "node_modules"),
    );
    fs.symlinkSync(
      path.join(root, "tests/integration/node_modules"),
      path.join(stage, "tests/integration/node_modules"),
    );
    const client = path.join(stage, "generated-client");
    const schema = fs
      .readFileSync(path.join(root, "prisma/schema.prisma"), "utf8")
      .replace(
        /generator client \{[\s\S]*?\}/,
        () =>
          `generator client {\n provider = "prisma-client-js"\n engineType = "client"\n output = "${client}"\n}`,
      );
    const schemaFile = path.join(stage, "fixture.prisma");
    fs.writeFileSync(schemaFile, schema);
    const port = await freePort(),
      baseUrl = `http://127.0.0.1:${port}`;
    const env = {
      PATH: process.env.PATH,
      HOME: stage,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      DATABASE_URL: url,
      PROSTORE_TEST_DATABASE_URL: url,
      PROSTORE_TEST_CLIENT: client,
      AUTH_SECRET: "disposable-staging-only-secret-not-for-deployment",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: baseUrl,
      NEXT_PUBLIC_SERVER_URL: baseUrl,
      ZENOPAY_API_KEY: "fixture-only",
      AT_API_KEY: "fixture-only",
    };
    cp.execFileSync(
      process.execPath,
      [
        path.join(root, "node_modules/prisma/build/index.js"),
        "generate",
        "--schema",
        schemaFile,
      ],
      {
        cwd: stage,
        env: {
          ...env,
          PRISMA_SCHEMA_ENGINE_BINARY: "/bin/true",
          PRISMA_QUERY_ENGINE_LIBRARY: "/bin/true",
        },
        stdio: "inherit",
      },
    );
    // Use one generated runtime everywhere, including Prisma's JSON-null sentinels.
    for (const f of files) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const p = path.join(stage, f);
      if (fs.existsSync(p))
        fs.writeFileSync(
          p,
          fs
            .readFileSync(p, "utf8")
            .replaceAll('"@prisma/client"', JSON.stringify(client)),
        );
    }
    const dbFile = path.join(stage, "db/prisma.ts");
    let db = fs
      .readFileSync(dbFile, "utf8")
      .replace(
        'import ws from "ws";',
        `import ws from "ws";\nimport { PrismaPg } from "${root}/tests/integration/node_modules/@prisma/adapter-pg";`,
      )
      .replace(
        "datasourceUrl: connectionString,",
        "adapter: new PrismaPg({ connectionString }),",
      );
    fs.writeFileSync(dbFile, db);
    const fixtureFile = path.join(stage, "tests/integration/database.cjs");
    let fixture = fs
      .readFileSync(fixtureFile, "utf8")
      .replace(
        '  "User",',
        '  "Cart", "Review", "Account", "Session", "Certification", "Banner", "BannerItem", "SupplierPolicy", "ProductComment", "Notification", \n  "User",',
      )
      .replace(
        "defaultValue.startsWith",
        `defaultValue === '[]' ? "'{}'" : defaultValue.startsWith`,
      );
    fs.writeFileSync(fixtureFile, fixture);
    const fontFile = path.join(stage, "fonts.cjs");
    fs.writeFileSync(
      fontFile,
      "module.exports=" +
        JSON.stringify({
          "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap":
            '/* latin */\n@font-face { font-family: Inter; font-style: normal; font-weight: 100 900; src: url(/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf) format("truetype"); }',
        }),
    );
    env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = fontFile;
    const state = { stage, name, env, baseUrl };
    fs.writeFileSync(stateFile, JSON.stringify(state));
    fs.copyFileSync(
      path.join(root, "tests/browser/provider-fixture.cjs"),
      path.join(stage, "provider-fixture.cjs"),
    );
    fs.writeFileSync(
      path.join(stage, "payments.json"),
      JSON.stringify({ orders: {}, collections: 0 }),
    );
    env.NODE_OPTIONS = "--require=" + path.join(stage, "provider-fixture.cjs");
    const driverEnv = {
      ...env,
      NODE_OPTIONS: "",
      PROSTORE_BROWSER_STATE: stateFile,
      NODE_PATH: process.env.NODE_PATH,
      PROSTORE_CHROMIUM: process.env.PROSTORE_CHROMIUM || "/usr/bin/chromium",
    };
    await run(path.join(root, "tests/browser/seed.cjs"), driverEnv);
    const buildLog = fs.openSync(path.join(stage, "build.log"), "w");
    const build = cp.spawnSync(
      process.execPath,
      [path.join(root, "node_modules/next/dist/bin/next"), "build"],
      { cwd: stage, env, stdio: ["ignore", buildLog, buildLog] },
    );
    if (build.status !== 0)
      throw Error("Full staging build failed; inspect build.log");
    console.log(
      "PASS full optimized staging build with test-only adapter/font fixture",
    );
    const log = fs.openSync(path.join(stage, "server.log"), "w");
    server = cp.spawn(
      process.execPath,
      [
        path.join(root, "node_modules/next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { cwd: stage, env, stdio: ["ignore", log, log], detached: true },
    );
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw Error("Staging server exited");
      try {
        const r = await fetch(baseUrl + "/api/auth/csrf");
        if (r.ok) break;
      } catch {}
      if (i === 119) throw Error("Staging server startup timed out");
      await new Promise((r) => setTimeout(r, 500));
    }
    for (const test of [
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
    ])
      await run(path.join(root, "tests/browser", test + ".cjs"), driverEnv);
    console.log("PASS all disposable browser workflow assertions");
  } finally {
    if (server) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {}
    }
    if (started) docker(["stop", "--time", "2", name]);
    // Contains only synthetic sessions/data; retained locally for failure diagnosis.
    console.log("Disposable staging logs:", stage, "(database removed)");
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
