# Consolidated launch candidate validation

This candidate consolidates the complete marketplace stack through PR33. Use its exact release manifest/tree, not individual feature commits or a synthetic hosted branch. The release PR targets main for a single reviewed cutover; merging is not yet safe against the unchanged deployment/database configuration.

## Latest source evidence

- 617 unit/action regressions passed.
- 215 disposable PostgreSQL17.11 regressions passed through all58 historical/additive SQL migrations using the established test-only JavaScript Prisma adapter. Synthetic backup/restore matched21 tables plus schema/constraints.
- Lint passed with existing warnings. Full optimized fixture build passed including TypeScript against the generated test client.
- Browser workflows passed: authentication, cart/tier pricing, checkout, pending/retry/duplicate mocked settlement, supplier dispatch, buyer delivery, legacy archive, native product chat, buyer/two-seller isolation, proposal acceptance/expiry, payment cards and staff reporting/review.
- Independent review completed. Browser-discovered payment-label and pre-hydration staff form issues were fixed and the complete selected workflows rerun successfully.
- Source manifest has no packaging issues and includes58 migration checksums. No demo fixture runtime/build hook is in the production source. Production approval remains false until operational gates are met.

## Exact evidence boundaries

The source tree validated through PR33 is `f593a7b6b31f46a92512ca9fae77212721ae8389`, remote commit `ace5c15e80c6bc954a1ca8c823e4236682ff3901`. This consolidation only updates release documentation; its manifest identifies the new final commit/tree.

Native engine checksum download returned403 in an earlier task; no retry or alternate-source/executor bypass was used. Fixture type/build/test success is not native deployment verification. The root native client is stale for recent schema additions, so root native typecheck is not claimed passed.

Prior protected hosted-native evidence belongs to `9cfb426eff4da392706f01a080728f200bce8300`: native Prisma,192 PG16 tests,49 worker contracts,full build and17 loopback browser workflows with mocked providers. This is an older synthetic test branch, not the current production artifact. Provider operation is owner-confirmed; no real charge/SMS acceptance test was run by this release validation.

## Current cutover constraints

Read-only hosting inspection on2026-10-30 still identifies production main at `52948fad457ceeb2eb67dfbdd9fd90812de06333`; main is an ancestor of the complete candidate, not a diverged release. The production project still lists shared preview/production database/provider configuration. Variable presence does not establish safe values, clean database identity or usable credentials. No secret values were retrieved.

The connected Neon inventory exposes a Nimboya synthetic staging project, not the previously identified old production project or an approved clean operational database. No retry of denied old-project access and no use of a credential pasted in chat occurred. Other businesses' databases are not release targets.

This executor has no server-management connection, outbound identity, runtime secret or server network grant. Existing servers therefore cannot be selected, configured or assessed for capacity/backups/service impact here. Stopped legacy Redis remains untouched; a clean native release must not replay Chatwoot queues.

Before production: establish an approved commercial host and clean operational database with coordinated credential configuration, prove exact native candidate/schema/backup/restore on that target, configure and validate bounded notification/reconciliation worker operation, resolve the deferred outbound integration and exposed-credential boundary, then stage and verify the exact production build before domain cutover. Preserve old data and new post-cutover writes in rollback. Do not promote the demo or merge merely to trigger a build against shared live settings. No paid commitment, merge, deployment, live migration or external financial operation has been performed by this consolidation.

Read-only staging schema verification: PostgreSQL16.15 `nimboya_staging` contains55 completed migration records, all matching repository checksums; no unfinished/rolled-back records were found. The three missing migrations are `20261031010000_chat_sender_rate_index`, `20261031020000_market_chat_safety`, and `20261031030000_market_proposal_expiry`. Their absent tables/column were independently confirmed via catalog metadata. No DDL, seed/reset or migration-history write was performed. An initial query used the nonexistent database name `neondb` and returned404; listing database metadata resolved the actual staging name, after which the read succeeded. This was not an access denial or alternate access route.
