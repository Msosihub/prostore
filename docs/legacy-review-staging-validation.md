# PostgreSQL17 release validation

Candidate application delta: PR19 / 8ff0c1c83e0c649bc1d8986c0a3cd60559872e39. The preparation worktree contains the same application code plus local read-only diagnostic tooling; no production data or credentials are inputs.

## Evidence boundaries

- PostgreSQL17.11:177 integration regressions against the historical54-file SQL chain;17-table synthetic pg_dump/restore with schema/constraint equality. Test client uses the JS/pg Prisma adapter. This is not native Prisma migration/client validation.
- Existing native hosted evidence covers the earlier candidate on PostgreSQL16 only. It cannot certify this candidate on17.
- Local native Prisma binaries are absent. Current managed HTTP policy is enforced and does not allow binaries.prisma.sh; prior denied downloads were not retried and no mirror/alternate route was used. Existing hosted staging guard explicitly binds the approved PostgreSQL16 target. No new remote database, credential or hosting configuration was created in this turn.
- Browser harness now accepts the existing strict PROSTORE_TEST_PG_MAJOR=16|17 selector. It creates its own disposable database and fixture app, with test adapter/fonts and provider mocks. New legacy-review browser scenario checks mobile/desktop, repeated read-only rendering and revoked admin access.

## Mandatory remaining release gates

1. Native Prisma migration/client and full browser/build validation for the latest candidate on PostgreSQL17. Supported next route: approve/configure official Prisma engine-host access for the managed executor, or explicitly establish a PostgreSQL17 synthetic hosted target with staging-only credential/configuration scope. Do not upgrade or repoint an existing database silently.
2. Populated production adoption: matching metadata is necessary but insufficient. Reconcile legacy paid orders and existing stock, escrow/wallet, returns and ledger movements privately. Derived review UI is not financial clearance. No reset/backfill/replay or history-marking operation is authorized by a fixture pass.
3. Verified actual backup and restore, approved maintenance/writer coordination, migration-history adoption rehearsal and rollback using valid credentials. Synthetic restore is not a production restore test.
4. Approved provider acceptance, reconciliation/outbox/seller-notice workers and monitoring. Mock callbacks/SMS do not establish provider acceptance. Do not enable real sends or schedulers from this validation.
5. Credential incident remediation through a coordinated, action-time-approved cutover; no shared credential use. Keep execution of payouts/refunds gated on agreed policy and independently verified settlement.
6. Review the stacked draft dependency chain and exact deployed SHA/configuration before any merge/promotion. Production remains unchanged.

## Completed browser run

All15 workflow scripts passed in one final run against actual PostgreSQL17.11. The full optimized Next build/prerender passed using the explicit test-only Prisma adapter and font fixture. Covered storefront/mobile/SEO/loading, discovery, OTP, cart/tier and Buy Now parity, pending/interrupted/duplicate mocked payments, multi-seller dispatch/delivery/disputes, admin reporting/outbox/manual money reviews, chat proposals/tenancy, catalog authorization, seller registration/shops, and the new legacy-review page. Its repeated page loads left order/items and ledger count unchanged; a revoked admin was denied. Mobile375px and desktop1280px screenshots were inspected. No live providers were called.

Initial run stopped because an existing test clicked the first payment-path link, now the legacy queue. The test now selects the exact known payment-attempt ID; financial assertions are unchanged. Final run completed successfully. Discovery logged one nonfatal React hydration error418 while its assertions passed; source/cause remains unverified and should be reproduced before calling frontend validation warning-free.

Local evidence: /tmp/legacy-review-browser17-final.log and /tmp/prostore-browser-UCrkex/{build.log,server.log,legacy-review-mobile.png,legacy-review-desktop.png}. These are local synthetic QA artifacts, not a user-accessible preview. Disposable server/database cleanup completed. Independent test-diff review found no blocker. No native17 claim, production backup/restore, remote deployment or credential change occurred.
