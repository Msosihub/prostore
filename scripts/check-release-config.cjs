// Offline stdin-only checks. Never reads .env/process.env, connects, or prints values.
const fs = require("node:fs");
function checkConfig(input) {
  const issues = [];
  const add = (severity, field, code) => issues.push({ severity, field, code });
  const env = input?.environment;
  if (!env || typeof env !== "object" || Array.isArray(env))
    return {
      scope: "static_configuration_only",
      issues: [
        { severity: "error", field: "environment", code: "OBJECT_REQUIRED" },
      ],
    };
  const present = (name) =>
    typeof env[name] === "string" && env[name].trim().length > 0;
  for (const name of [
    "DATABASE_URL",
    "NEXT_PUBLIC_SERVER_URL",
    "ZENOPAY_API_KEY",
    "AT_API_KEY",
  ])
    if (!present(name)) add("error", name, "REQUIRED");
  for (const name of Object.keys(env))
    if (
      /^NEXT_PUBLIC_.*(?:SECRET|PASSWORD|TOKEN|API_KEY|DATABASE_URL)$/i.test(
        name,
      )
    )
      // Do not echo arbitrary caller field names into diagnostic output.
      add("error", "NEXT_PUBLIC_*", "POSSIBLE_PUBLIC_CREDENTIAL");
  const parse = (name) => {
    try {
      return new URL(env[name]);
    } catch {
      add("error", name, "INVALID_URL");
      return null;
    }
  };
  if (present("DATABASE_URL")) {
    const db = parse("DATABASE_URL");
    if (
      db &&
      (!["postgres:", "postgresql:"].includes(db.protocol) ||
        !db.hostname ||
        db.pathname === "/" ||
        !db.pathname)
    )
      add("error", "DATABASE_URL", "POSTGRES_DATABASE_REQUIRED");
    if (
      db &&
      !["require", "verify-ca", "verify-full"].includes(
        db.searchParams.get("sslmode"),
      )
    )
      add("warning", "DATABASE_URL", "VERIFY_TRANSPORT_SECURITY");
  }
  if (present("NEXT_PUBLIC_SERVER_URL")) {
    const base = parse("NEXT_PUBLIC_SERVER_URL");
    if (
      base &&
      (base.protocol !== "https:" ||
        base.username ||
        base.password ||
        base.search ||
        base.hash ||
        ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
    )
      add("error", "NEXT_PUBLIC_SERVER_URL", "PUBLIC_HTTPS_ORIGIN_REQUIRED");
    if (base && base.pathname !== "/")
      add(
        "warning",
        "NEXT_PUBLIC_SERVER_URL",
        "CALLBACK_PATH_IS_ROOT_RELATIVE",
      );
  }
  // Match installed next-auth/lib/env.js: AUTH_SECRET takes nullish precedence.
  const authSecret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  if (typeof authSecret !== "string" || !authSecret.trim())
    add("error", "AUTH_SECRET", "AUTH_SECRET_OR_LEGACY_REQUIRED");
  else if (authSecret.length < 32)
    add("warning", "AUTH_SECRET", "VERIFY_SECRET_ENTROPY");
  if (present("GOOGLE_CLIENT_ID") !== present("GOOGLE_CLIENT_SECRET"))
    add("error", "GOOGLE_*", "INCOMPLETE_CREDENTIAL_PAIR");
  const pesapal = [
    "PESAPAL_BASE_URL",
    "PESAPAL_CONSUMER_KEY",
    "PESAPAL_CONSUMER_SECRET",
  ];
  if (pesapal.some(present)) {
    for (const name of pesapal)
      if (!present(name))
        add("error", name, "INCOMPLETE_PESAPAL_CONFIGURATION");
    if (
      present("PESAPAL_BASE_URL") &&
      ![
        "https://cybqa.pesapal.com/pesapalv3/api",
        "https://pay.pesapal.com/v3/api",
      ].includes(env.PESAPAL_BASE_URL.replace(/\/$/, ""))
    )
      add("error", "PESAPAL_BASE_URL", "VERIFY_API3_BASE_URL");
  }
  if (input.previewTrackingEnabled !== false)
    add("error", "previewTrackingEnabled", "PREVIEW_MUST_REMAIN_DISABLED");
  add("warning", "runtime", "NATIVE_ENGINE_AND_TARGET_BUILD_REQUIRE_EXECUTION");
  add("warning", "providers", "MOCKS_DO_NOT_ESTABLISH_SANDBOX_ACCEPTANCE");
  return { scope: "static_configuration_only", issues };
}
module.exports = { checkConfig };
if (require.main === module) {
  try {
    const result = checkConfig(JSON.parse(fs.readFileSync(0, "utf8")));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = result.issues.some((i) => i.severity === "error")
      ? 1
      : 0;
  } catch {
    process.stderr.write(
      "Invalid configuration input; no values were logged.\n",
    );
    process.exitCode = 1;
  }
}
