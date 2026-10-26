const { execFileSync } = require("node:child_process"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const baseline = "52948fad457ceeb2eb67dfbdd9fd90812de06333";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const files = git("diff", baseline, "--name-only")
  .trim()
  .split("\n")
  .filter(Boolean);
const forbidden =
  /^(auth(?:\.config)?\.ts|prisma\/|db\/|app\/api\/|lib\/actions\/|components\/product-action|app\/\(root\)\/(cart|order|place-order|payment-method|shipping-address)(\/|$))/;
assert.deepEqual(
  files.filter((f) => forbidden.test(f)),
  [],
  "Business/auth/schema changes are outside this candidate",
);
const previous = JSON.parse(git("show", baseline + ":package.json")),
  current = JSON.parse(fs.readFileSync("package.json"));
assert.deepEqual(current.dependencies, previous.dependencies);
assert.deepEqual(current.devDependencies, previous.devDependencies);
console.log(
  "PASS storefront-only dependency boundary against verified main " + baseline,
);
