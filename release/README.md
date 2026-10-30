# Nimboya production candidate and cutover package

Use the complete `release/nimboya-candidate` tree, not individual feature drafts and not `test/hosted-*`. This branch includes the accumulated marketplace changes. Its PR compares only the final integration delta to the preceding branch for review; deploying a partial stack is unsupported. This package authorizes no infrastructure operation by itself.

## 1. Freeze the reviewed candidate

From a clean checkout run `node scripts/release-manifest.cjs > /private/release-manifest.json`. The manifest records exact commit/tree, each migration SHA256 and source-package check results; productionApproved remains false because source checks cannot verify live operations. Review the archive listing from `git archive HEAD | tar -tf -`: known legacy key files, local env files, tests and temporary hosted scripts must be absent. Use provider-managed secrets at runtime, never source/archive values. The ignore rules do not remove historical exposure or prove a comprehensive secret audit; keep owner-led remediation separate and specifically approved.

Do not ship raw repository history or a working directory as the deployment artifact. Vercel/Docker context exclusions and Next tracing exclusions additionally omit known key and test artifacts. Build is `next build`, start is `next start`, postinstall only generates Prisma; neither migrates nor seeds. Run migrations as a separately approved one-off operation, never by the production build hook. Reject temporary instrumentation, QA routes and destructive hosted fixture builders.

## 2. Target and backup record — REQUIRED before changes

Record approved hosting project/server, exact new operational database project/branch/database, owner, restore point, retention and latest successful restore evidence in a private operator record. Existing production rollback reference is deployment dpl_Dw2gE9BLEgtKJyXCe5oXcXEofKZu at 52948fad457ceeb2eb67dfbdd9fd90812de06333; recheck immediately before cutover. That old code/database pair is not a safe rollback destination for new orders.

The owner says historical transactions and catalog were trials. Preserve that database intact; no per-order historical financial reconciliation is required. Do not promote destructive synthetic test harnesses, fixture identities or shared demo passwords. Initialize an approved clean operational target, using only explicitly approved catalog/seller identities and correct availability. The rehearsal importer is test-only and must not be repointed at production. If approved representative data is used, record that provenance; do not call it an exact original-data transfer or invent sales/reviews.

The existing isolated preview proves a rehearsal, not an actual production backup. Verify backup/restore for the selected operational target before accepting new writes. Never use the database credential exposed in chat. New/replacement access configuration requires specific action-time approval through managed secrets.

## 3. Schema and runtime

Verify the 55-migration manifest against the target's actual history. On the approved EMPTY target apply the complete reviewed chain using the native runtime. Never reset, db-push, edit applied checksums or blindly mark migrations applied. For populated targets use the separate baseline/adoption procedure; this clean-start package does not authorize in-place conversion.

Run runtime/release preflight SQL and verify expected schema/constraints, then a full native target build and non-chargeable page/auth checks. Keep migration/build identity tied to the manifest. Confirm account roles, seller ownership, inventory, domain/canonical URLs and callback origin. The exact candidate's newly added packaging/redirect fixes still need native target deployment validation; earlier native staging evidence must not be relabeled as that pass.

## 4. Providers and background work

Existing ZenoPay and Africa's Talking are owner-confirmed operational. Sandbox configuration is optional. Preserve their live hosts/account settings and configured credentials; do not change them merely to test. Initiation is pending, authenticated status/amount/reference verification is decisive, and redirects now fail closed. No real provider acceptance test was performed by these code checks.

The caller and disabled entrypoint are documented in `docs/production-release-path.md` and `docs/disabled-worker-sandbox-setup.md`. Approve runtime/operator, secret configuration, server-owned queue modes, cadence/budget, monitoring and stop procedure. Start dry-run, inspect queue age/errors and then explicitly approve execution. `--invoke` can execute work according to server mode; it is not a dry-run flag. Queue acceptance does not prove delivery. No live schedule is installed. Refund/payout execution remains gated; admin review is not a transfer.

Any deliberate live SMS/payment check needs authorized recipient, amount where applicable, count and scope. Do not send or charge under generic deployment approval. The previously deferred legacy messaging integration is outside the new worker controls and remains an unresolved release decision. It has not been audited closed, disabled or rewritten by this package. Operator review of that exposed integration is required before claiming complete outbound-control coverage.

## 5. Hosting, protection and approval

Continue non-commercial testing on protected Hobby preview; no upgrade is required for preparation. Actual commercial launch needs a host/plan that permits it. Vercel Hobby currently has daily cron and non-commercial restrictions. Existing-server deployment is an alternative only after approved access, capacity/isolation/backups/TLS/network/service-impact verification. No server access was available in this workspace. No Coolify or other runtime is installed by this package.

Before cutover explicitly approve the exact source SHA, database configuration, migration window, worker configuration and hosting/domain promotion. Do not expose preview demo data to customers or remove protection for convenience. No production change or billing action has yet been performed.

## 6. Cutover and stop/rollback

Record a write boundary, back up and preserve the old trial book, then point the approved compatible application at the new operational book. Keep domain/callback changes coordinated. New orders and attempts retain new unique references. Stray authenticated old callbacks remain durable review evidence, never a replay into new orders. Do not acknowledge unknown events as settled.

After cutover watch errors, due/unknown/failed queue ages, verified-paid-but-unfulfilled cases, stock and ledger invariants. On an incident stop affected new acceptance through an approved operation, preserve in-flight outcomes and disable future worker invocations as needed. Roll back only to code compatible with the NEW database/schema; retain new orders, payments, outbox and audit records. Never restore a pre-cutover snapshot over post-cutover writes without reconciliation. Removing additive tables or silently switching back to the trial database is not a rollback plan.

## 7. Evidence and remaining decisions

Use the current run report alongside the exact manifest. Prior protected hosted SHA 9cfb426eff4da392706f01a080728f200bce8300 passed native Prisma, 192 PG16 tests, 49 worker contracts, full build and 17 loopback browser workflows with mocked providers. It is a temporary test branch, not a production artifact.

Remaining operational decisions are concrete: approved clean production database/access+backup; permitted commercial host; worker secret/mode/runtime activation; deferred legacy integration disposition; historical exposed-credential remediation where applicable; exact cutover approval. No mandatory sandbox or repetitive trial-order reconciliation is imposed. Do not represent these decisions or source tooling as completed live actions.
