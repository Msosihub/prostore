const {
  assertStaging,
  PROJECT,
  HOST,
} = require("../scripts/hosted-staging-guard.cjs");
const fixture = () => ({
  VERCEL_PROJECT_ID: PROJECT,
  PROSTORE_HOSTED_STAGING: "synthetic-only",
  DATABASE_URL: `postgresql://nimboya_staging_owner:synthetic@${HOST}/nimboya_staging?sslmode=require`,
});
test("hosted runner accepts only declared synthetic resource identity", () =>
  expect(assertStaging(fixture()).hostname).toBe(HOST));
test.each(["VERCEL_PROJECT_ID", "PROSTORE_HOSTED_STAGING", "DATABASE_URL"])(
  "missing identity %s fails closed",
  (key) => {
    const env = fixture();
    delete env[key];
    expect(() => assertStaging(env)).toThrow();
  },
);
test.each([
  "postgresql://nimboya_staging_owner:synthetic@other.neon.tech/nimboya_staging",
  "postgresql://nimboya_staging_owner:synthetic@" + HOST + "/production",
  "postgresql://another:synthetic@" + HOST + "/nimboya_staging",
])("wrong database identity is refused", (DATABASE_URL) =>
  expect(() => assertStaging({ ...fixture(), DATABASE_URL })).toThrow(),
);
test("real provider configuration is rejected without echoing values", () =>
  expect(() =>
    assertStaging({ ...fixture(), AT_API_KEY: "sensitive-synthetic-marker" }),
  ).toThrow("Real integration configuration forbidden in staging"));
test("staging network firewall rejects unmocked external fetch, HTTP and TCP before sending", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `require('./scripts/hosted-staging-network.cjs').install();
 (async()=>{let rejected=0;try{await fetch('https://api.example.test/send')}catch{rejected++}
 try{require('https').get('https://api.example.test/send')}catch{rejected++}
 try{require('net').connect(443,'api.example.test')}catch{rejected++}
 if(rejected!==3)process.exit(1);console.log('blocked');})()`,
    ],
    {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH, ...fixture() },
      encoding: "utf8",
    },
  );
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("blocked");
});
test.each([
  "?host=/tmp/other-socket&sslmode=disable",
  "?sslmode=disable",
  "?sslmode=require&host=other",
  "?sslmode=require&sslmode=disable",
  "?sslmode=require&schema=other",
  "?sslmode=require#other",
])("connection override refused: %s", (suffix) => {
  const env = fixture();
  env.DATABASE_URL = env.DATABASE_URL.split("?")[0] + suffix;
  expect(() => assertStaging(env)).toThrow();
});
test("unexpected database port refused", () => {
  const env = fixture();
  env.DATABASE_URL = env.DATABASE_URL.replace(HOST, HOST + ":4444");
  expect(() => assertStaging(env)).toThrow();
});
