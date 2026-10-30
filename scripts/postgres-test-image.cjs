// Only supported official images for task-owned disposable test databases.
module.exports = function postgresTestImage(major = process.env.PROSTORE_TEST_PG_MAJOR || '16') {
  if (!['16', '17'].includes(major)) throw Error('Unsupported disposable PostgreSQL major');
  return `postgres:${major}-alpine`;
};
