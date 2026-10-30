// Temporary hosted rehearsal only. Never merge this branch into production.
const PROJECT = "prj_MPVXg88eRPg4ggzn5pFl3NZbUHtM";
const HOST = "ep-late-night-b8jzq29h.c-14.us-east-1.aws.neon.tech";
function assertStaging(env = process.env) {
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw Error("Staging database identity required");
  }
  if (
    env.VERCEL_PROJECT_ID !== PROJECT ||
    env.PROSTORE_HOSTED_STAGING !== "synthetic-only" ||
    url.hostname !== HOST ||
    url.pathname !== "/nimboya_staging" ||
    (url.port !== "" && url.port !== "5432") ||
    url.hash !== "" ||
    url.searchParams.get("sslmode") !== "require" ||
    [...url.searchParams].some(
      ([key, value]) =>
        !["sslmode", "channel_binding"].includes(key) ||
        value !== "require" ||
        url.searchParams.getAll(key).length !== 1,
    ) ||
    decodeURIComponent(url.username) !== "nimboya_staging_owner" ||
    !["postgresql:", "postgres:"].includes(url.protocol)
  )
    throw Error("Refusing non-staging target");
  for (const key of [
    "ZENOPAY_API_KEY",
    "AT_API_KEY",
    "AT_SANDBOX_API_KEY",
    "OPENAI_API_KEY",
    "PESAPAL_CONSUMER_KEY",
    "PESAPAL_CONSUMER_SECRET",
    "PUSHER_SECRET",
    "NEXT_PUBLIC_PUSHER_KEY",
    "GOOGLE_CLIENT_SECRET",
    "INTERNAL_SHARED_SECRET",
    "UPLOADTHING_TOKEN",
  ])
    if (env[key] && env[key] !== "fixture-only")
      throw Error("Real integration configuration forbidden in staging");
  for (const key of [
    "NIMBOYA_WORKER_SECRET",
    "NIMBOYA_PAYMENT_WORKER_MODE",
    "NIMBOYA_ORDER_WORKER_MODE",
    "NIMBOYA_SELLER_WORKER_MODE",
  ])
    if (env[key])
      throw Error(
        "Persistent worker configuration forbidden in synthetic staging",
      );
  return url;
}
module.exports = { assertStaging, PROJECT, HOST };
