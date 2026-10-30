// Offline source manifest. No environment values, database or network access.
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  crypto = require("node:crypto");
function inspectRelease({ files, packageJSON, exclusions }) {
  const issues = [];
  if (
    packageJSON.scripts?.build !== "next build" ||
    packageJSON.scripts?.start !== "next start" ||
    packageJSON.scripts?.postinstall !== "prisma generate"
  )
    issues.push("UNREVIEWED_BUILD_HOOK");
  if (
    files.some(
      (p) =>
        p === "instrumentation.ts" ||
        p === "provider-fixture.cjs" ||
        p.startsWith("app/qa-loading/") ||
        p.startsWith("scripts/hosted-") ||
        p.startsWith("tests/hosted/"),
    )
  )
    issues.push("HOSTED_REHEARSAL_SOURCE_PRESENT");
  for (const name of [".vercelignore", ".dockerignore"]) {
    const lines = (exclusions[name] || "").split(/\r?\n/).map((s) => s.trim());
    if (
      !["abc", "abc.pub", ".env*", "tests", "scripts/hosted-*"].every((p) =>
        lines.includes(p),
      )
    )
      issues.push("DEPLOYMENT_EXCLUSIONS_MISSING");
  }
  const attributes = (exclusions[".gitattributes"] || "")
    .split(/\r?\n/)
    .map((s) => s.trim());
  if (
    !["/abc", "/abc.pub", "/.env*", "/tests", "/scripts/hosted-*"].every((p) =>
      attributes.includes(`${p} export-ignore`),
    )
  )
    issues.push("ARCHIVE_EXCLUSIONS_MISSING");
  return [...new Set(issues)];
}
module.exports = { inspectRelease };
if (require.main === module) {
  try {
    const root = path.resolve(__dirname, "..");
    const git = (...args) =>
      cp
        .execFileSync("git", args, {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        })
        .trim();
    if (git("status", "--porcelain")) throw Error("SOURCE_NOT_CLEAN");
    const files = git("ls-files").split("\n");
    const exclusions = Object.fromEntries(
      [".vercelignore", ".dockerignore", ".gitattributes"].map((p) => [
        p,
        fs.existsSync(path.join(root, p))
          ? fs.readFileSync(path.join(root, p), "utf8")
          : "",
      ]),
    );
    const issues = inspectRelease({
      files,
      packageJSON: JSON.parse(
        fs.readFileSync(path.join(root, "package.json"), "utf8"),
      ),
      exclusions,
    });
    const migrations = files
      .filter((p) => /^prisma\/migrations\/[^/]+\/migration.sql$/.test(p))
      .sort()
      .map((p) => ({
        path: p,
        sha256: crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(root, p)))
          .digest("hex"),
      }));
    console.log(
      JSON.stringify(
        {
          scope: "source_package_only",
          commit: git("rev-parse", "HEAD"),
          tree: git("rev-parse", "HEAD^{tree}"),
          productionApproved: false,
          issues,
          migrations,
        },
        null,
        2,
      ),
    );
    process.exitCode = issues.length ? 1 : 0;
  } catch {
    console.error(
      "Release manifest refused: use a clean reviewed source checkout; no values logged.",
    );
    process.exitCode = 1;
  }
}
