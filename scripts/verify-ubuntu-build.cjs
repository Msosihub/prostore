// Offline startup guard. No network, migrations, env-value output or native generation.
const fs = require("node:fs");
const path = require("node:path");
function verifyUbuntuBuild(
  root = process.cwd(),
  nodeVersion = process.versions.node,
) {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
  if (nodeVersion.split(".")[0] !== "22") throw Error("Node22 required");
  const pkg = read("package.json");
  if (
    pkg.scripts?.build !== "next build" ||
    pkg.scripts?.postinstall !== "prisma generate"
  )
    throw Error("Unreviewed build hooks");
  if (
    ["provider-fixture.cjs", "instrumentation.ts"].some((p) =>
      fs.existsSync(path.join(root, p)),
    )
  )
    throw Error("Rehearsal source is not deployable");
  if (
    read("node_modules/next/package.json").version !== "15.5.9" ||
    read("node_modules/@prisma/client/package.json").version !== "6.19.2"
  )
    throw Error("Revalidate package version contract");
  const built = read(".next/required-server-files.json").config;
  if (
    built?.experimental?.isrFlushToDisk !== false ||
    built.cacheMaxMemorySize !== 50 * 1024 * 1024
  )
    throw Error("Rebuild with immutable release mode");
  if (!fs.readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim())
    throw Error("Missing build identity");
  fs.accessSync(path.join(root, ".next/cache"), fs.constants.W_OK);
  return {
    buildConfigurationVerified: true,
    nativeRuntimeVerified: false,
    databaseVerified: false,
  };
}
module.exports = { verifyUbuntuBuild };
if (require.main === module) {
  try {
    console.log(JSON.stringify(verifyUbuntuBuild()));
  } catch {
    console.error(
      "Ubuntu build preflight failed; inspect reviewed build version, mode, cache permissions and fixture exclusions",
    );
    process.exitCode = 1;
  }
}
