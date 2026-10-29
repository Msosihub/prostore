const { checkConfig } = require("../scripts/check-release-config.cjs");
const { execFileSync, spawnSync } = require("node:child_process");
const path = require("node:path");
const script = path.join(__dirname, "../scripts/check-release-config.cjs");
const configuration = () => ({
  previewTrackingEnabled: false,
  environment: {
    DATABASE_URL:
      "postgresql://synthetic:fixture@database.example.test/shop?sslmode=require",
    NEXT_PUBLIC_SERVER_URL: "https://shop.example.test",
    AUTH_SECRET: "synthetic-release-check-secret-not-live",
    ZENOPAY_API_KEY: "fixture-only",
    AT_API_KEY: "fixture-only",
  },
});
test("valid synthetic settings retain explicit runtime/provider validation limits", () => {
  const result = checkConfig(configuration());
  expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  expect(result.issues.map((i) => i.code)).toEqual(
    expect.arrayContaining([
      "NATIVE_ENGINE_AND_TARGET_BUILD_REQUIRE_EXECUTION",
      "MOCKS_DO_NOT_ESTABLISH_SANDBOX_ACCEPTANCE",
    ]),
  );
});
test.each([
  "http://shop.example.test",
  "https://user:password@shop.example.test",
  "https://127.0.0.1",
  "https://shop.example.test?token=fixture",
])("rejects unsuitable public callback origin %s", (url) => {
  const input = configuration();
  input.environment.NEXT_PUBLIC_SERVER_URL = url;
  expect(checkConfig(input).issues).toContainEqual({
    severity: "error",
    field: "NEXT_PUBLIC_SERVER_URL",
    code: "PUBLIC_HTTPS_ORIGIN_REQUIRED",
  });
});
test("catches exposed credentials and incomplete provider pairs without returning values or arbitrary names", () => {
  const input = configuration();
  input.environment.NEXT_PUBLIC_PRIVATE_API_KEY = "sensitive-fixture-marker";
  input.environment.GOOGLE_CLIENT_ID = "sensitive-fixture-marker";
  input.environment.PESAPAL_CONSUMER_KEY = "sensitive-fixture-marker";
  const result = checkConfig(input);
  expect(result.issues.map((i) => i.code)).toEqual(
    expect.arrayContaining([
      "POSSIBLE_PUBLIC_CREDENTIAL",
      "INCOMPLETE_CREDENTIAL_PAIR",
      "INCOMPLETE_PESAPAL_CONFIGURATION",
    ]),
  );
  expect(JSON.stringify(result)).not.toContain("sensitive-fixture-marker");
  expect(JSON.stringify(result)).not.toContain("NEXT_PUBLIC_PRIVATE_API_KEY");
});
test("stdin CLI never implicitly consumes inherited environment credentials", () => {
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ environment: {}, previewTrackingEnabled: false }),
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      DATABASE_URL: configuration().environment.DATABASE_URL,
    },
  });
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout).issues).toContainEqual({
    severity: "error",
    field: "DATABASE_URL",
    code: "REQUIRED",
  });
});
test("malformed stdin emits fixed diagnostic only", () => {
  const result = spawnSync(process.execPath, [script], {
    input: "sensitive-fixture-marker",
    encoding: "utf8",
  });
  expect(result.status).toBe(1);
  expect(result.stderr).not.toContain("sensitive-fixture-marker");
});
test("CLI static checks succeed without database or provider access", () => {
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(configuration()),
    encoding: "utf8",
    env: { PATH: process.env.PATH },
  });
  expect(JSON.parse(out).scope).toBe("static_configuration_only");
});

test("installed Auth.js legacy secret alias is accepted without printing it", () => {
  const input = configuration();
  input.environment.NEXTAUTH_SECRET = input.environment.AUTH_SECRET;
  delete input.environment.AUTH_SECRET;
  const result = checkConfig(input);
  expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  expect(JSON.stringify(result)).not.toContain(
    input.environment.NEXTAUTH_SECRET,
  );
});
test.each(["", "short", undefined])(
  "auth secret precedence/absence stays explicit: %s",
  (value) => {
    const input = configuration();
    input.environment.AUTH_SECRET = value;
    input.environment.NEXTAUTH_SECRET =
      "synthetic-legacy-secret-that-is-long-enough";
    const result = checkConfig(input);
    if (value === "")
      expect(result.issues).toContainEqual({
        severity: "error",
        field: "AUTH_SECRET",
        code: "AUTH_SECRET_OR_LEGACY_REQUIRED",
      });
    else if (value === "short")
      expect(result.issues).toContainEqual({
        severity: "warning",
        field: "AUTH_SECRET",
        code: "VERIFY_SECRET_ENTROPY",
      });
    else
      expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  },
);
test("missing both auth secret names is a static error", () => {
  const input = configuration();
  delete input.environment.AUTH_SECRET;
  expect(checkConfig(input).issues).toContainEqual({
    severity: "error",
    field: "AUTH_SECRET",
    code: "AUTH_SECRET_OR_LEGACY_REQUIRED",
  });
});
