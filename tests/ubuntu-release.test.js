const { invokeLocalWorker } = require("../scripts/invoke-local-worker.cjs");
const { checkLocalHealth } = require("../scripts/check-local-health.cjs");
import { GET } from "@/app/api/health/live/route";
const secret = "synthetic-worker-secret-only-for-testing";
test.each(["payments", "orders", "sellers"])(
  "local %s planning never sends",
  async (queue) => {
    const fetchImpl = jest.fn();
    expect(await invokeLocalWorker({ queue, fetchImpl })).toEqual({
      networkRequest: false,
      queue,
      target: `http://127.0.0.1:3100/api/internal/workers/${queue}`,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  },
);
test("local execution is authenticated, bounded and refuses redirects", async () => {
  const fetchImpl = jest.fn().mockResolvedValue(
    Response.json({
      queue: "orders",
      mode: "dry-run",
      examined: 1,
      private: "not returned",
    }),
  );
  expect(
    await invokeLocalWorker({
      queue: "orders",
      invoke: true,
      secret,
      fetchImpl,
    }),
  ).toEqual({
    networkRequest: true,
    queue: "orders",
    mode: "dry-run",
    examined: 1,
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    "http://127.0.0.1:3100/api/internal/workers/orders",
    expect.objectContaining({
      method: "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${secret}` },
    }),
  );
});
test.each(["../orders", "orders?mode=execute", "__proto__"])(
  "rejects local target injection %s",
  async (queue) => {
    const fetchImpl = jest.fn();
    await expect(
      invokeLocalWorker({ queue, invoke: true, secret, fetchImpl }),
    ).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  },
);
test("no credential causes no local request; failure is redacted with no retry", async () => {
  const fetchImpl = jest.fn();
  await expect(
    invokeLocalWorker({ queue: "orders", invoke: true, fetchImpl }),
  ).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
  fetchImpl.mockRejectedValue(new Error("private provider body"));
  await expect(
    invokeLocalWorker({ queue: "orders", invoke: true, secret, fetchImpl }),
  ).rejects.toThrow("outcome unconfirmed");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
test("health is minimal noncached liveness, not database/provider readiness", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  const fetchImpl = jest.fn().mockResolvedValue(response);
  expect(await checkLocalHealth(fetchImpl)).toEqual({
    live: true,
    databaseVerified: false,
    providersVerified: false,
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    "http://127.0.0.1:3100/api/health/live",
    expect.objectContaining({ redirect: "error" }),
  );
});
test.each([
  () => new Response("redirect", { status: 302 }),
  () => new Response("<html>login</html>"),
  () => Response.json({ status: "wrong" }),
  () => Response.json({ status: "ok", oversized: "a".repeat(200) }),
])("wrong listener cannot pass health", async (response) => {
  await expect(
    checkLocalHealth(jest.fn().mockResolvedValue(response())),
  ).rejects.toThrow();
});
test("locked Next cache supports immutable ISR writes and tag invalidation in memory", async () => {
  const Cache =
    require("next/dist/server/lib/incremental-cache/file-system-cache").default;
  const fsMock = {
    readFile: jest.fn().mockRejectedValue(new Error("no seed")),
    stat: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  };
  const cache = new Cache({
    fs: fsMock,
    flushToDisk: false,
    serverDistDir: "/immutable/server",
    revalidatedTags: [],
    maxMemoryCacheSize: 50 * 1024 * 1024,
  });
  const key = "ubuntu-isr-test";
  await cache.set(
    key,
    {
      kind: "APP_ROUTE",
      body: Buffer.from("catalog"),
      status: 200,
      headers: { "x-next-cache-tags": "ubuntu-catalog-test" },
    },
    {},
  );
  expect(
    (await cache.get(key, { kind: "APP_ROUTE" })).value.body.toString(),
  ).toBe("catalog");
  expect(fsMock.mkdir).not.toHaveBeenCalled();
  expect(fsMock.writeFile).not.toHaveBeenCalled();
  await cache.revalidateTag("ubuntu-catalog-test");
  expect(await cache.get(key, { kind: "APP_ROUTE" })).toBeNull();
});
test("offline service preflight rejects unreviewed builds and rehearsal fixtures", () => {
  const fs = require("node:fs"),
    path = require("node:path"),
    os = require("node:os");
  const { verifyUbuntuBuild } = require("../scripts/verify-ubuntu-build.cjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ubuntu-preflight-test-"));
  const put = (name, value) => {
    const p = path.join(root, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  };
  try {
    put("package.json", {
      scripts: { build: "next build", postinstall: "prisma generate" },
    });
    put("node_modules/next/package.json", { version: "15.5.9" });
    put("node_modules/@prisma/client/package.json", { version: "6.19.2" });
    put(".next/required-server-files.json", {
      config: {
        experimental: { isrFlushToDisk: false },
        cacheMaxMemorySize: 50 * 1024 * 1024,
      },
    });
    put(".next/BUILD_ID", "test-build");
    fs.mkdirSync(path.join(root, ".next/cache"));
    expect(verifyUbuntuBuild(root, "22.0.0")).toEqual({
      buildConfigurationVerified: true,
      nativeRuntimeVerified: false,
      databaseVerified: false,
    });
    expect(() => verifyUbuntuBuild(root, "20.0.0")).toThrow();
    put("provider-fixture.cjs", "test");
    expect(() => verifyUbuntuBuild(root, "22.0.0")).toThrow(/Rehearsal/);
    fs.unlinkSync(path.join(root, "provider-fixture.cjs"));
    put(".next/required-server-files.json", {
      config: { experimental: { isrFlushToDisk: true } },
    });
    expect(() => verifyUbuntuBuild(root, "22.0.0")).toThrow(/Rebuild/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
