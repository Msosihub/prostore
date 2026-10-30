// Offline files only: no database client, network or credential lookup.
const fs = require("node:fs");
if (process.argv.length !== 4) {
  console.error(
    "Usage: node scripts/catalog-launch-review.cjs manifest.json review.json",
  );
  process.exit(2);
}
try {
  const read = (file) => {
    if (fs.statSync(file).size > 16 * 1024 * 1024)
      throw Error("Input too large");
    return JSON.parse(fs.readFileSync(file, "utf8"));
  };
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: {
      module: "CommonJS",
      moduleResolution: "Node",
      esModuleInterop: true,
    },
  });
  const {
    verifyCatalogLaunch,
  } = require("../lib/catalog-launch-verification.ts");
  const result = verifyCatalogLaunch(
    read(process.argv[2]),
    read(process.argv[3]),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.readyForRehearsal ? 0 : 1;
} catch {
  // Validation exceptions may include private input. Do not print them.
  console.error(
    "Catalog review refused: invalid, missing or oversized input. Check the strict manifest and review schemas locally.",
  );
  process.exitCode = 2;
}
