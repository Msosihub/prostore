// Temporary hosted rehearsal transformation, never an application importer.
// Replace the loopback-only fixture guard with the stricter approved hosted identity.
module.exports = function adaptHostedCatalogFixture(source) {
  const prefixEnd = source.indexOf('assertTarget();');
  const start = source.indexOf('  if (\n    !/^postgresql:', prefixEnd);
  const endMarker = '    throw Error("Disposable rehearsal only");';
  const end = source.indexOf(endMarker, start);
  const databaseGuard = 'identity[0]?.name !== "prostore_payment_test"';
  if (prefixEnd < 0 || start < 0 || end < 0 || !source.includes(databaseGuard))
    throw Error('Hosted catalog fixture anchors changed');
  const prefix = `function assertTarget() {
  require('../../scripts/hosted-staging-guard.cjs').assertStaging();
  if (process.env.PROSTORE_TEST_DATABASE_URL !== process.env.DATABASE_URL)
    throw Error('Hosted rehearsal datasource mismatch');
}
`;
  return prefix + source.slice(prefixEnd, start) +
    '  assertTarget();' + source.slice(end + endMarker.length).replace(databaseGuard, 'identity[0]?.name !== "nimboya_staging"');
};
