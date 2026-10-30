// Offline preparation only. Never connects to a database or loads credentials.
const fs = require("node:fs");
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: {
      module: "CommonJS",
      moduleResolution: "Node",
      esModuleInterop: true,
    },
  });
  const {
    supplierSnapshotDigest,
    prepareSupplierCatalogTransfer,
  } = require("../lib/supplier-catalog-transfer.ts");
  const read = (file) => {
    if (fs.statSync(file).size > 16 * 1024 * 1024) throw Error("Too large");
    return JSON.parse(fs.readFileSync(file, "utf8"));
  };
  if (process.argv.length === 5 && process.argv[2] === "--draft") {
    const {
      draftSupplierTransferReview,
    } = require("../lib/supplier-transfer-review.ts");
    const draft = draftSupplierTransferReview(read(process.argv[3]));
    fs.writeFileSync(process.argv[4], JSON.stringify(draft, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        snapshotDigest: draft.snapshotDigest,
        proposedCategoryCorrections: draft.categoryCorrections.length,
        accountsToVerify: draft.accounts.length,
        stockToReview: draft.stock.length,
        approved: false,
        productionExecutionEnabled: false,
      }),
    );
  } else if (process.argv.length === 3) {
    console.log(
      JSON.stringify({
        snapshotDigest: supplierSnapshotDigest(read(process.argv[2])),
        productionExecutionEnabled: false,
      }),
    );
  } else if (process.argv.length === 5) {
    const result = prepareSupplierCatalogTransfer(
      read(process.argv[2]),
      read(process.argv[3]),
    );
    fs.writeFileSync(process.argv[4], JSON.stringify(result.input, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        digest: result.plan.digest,
        suppliers: result.plan.suppliers.length,
        products: result.plan.catalog.data.products.length,
        productionExecutionEnabled: false,
      }),
    );
  } else throw Error("Usage");
} catch {
  console.error(
    "Preparation refused. Use: node scripts/supplier-catalog-prepare.cjs snapshot.json [review.json NEW-output.json], or --draft snapshot.json NEW-review.json. Check strict schemas and review locally; existing output files are never overwritten.",
  );
  process.exitCode = 2;
}
