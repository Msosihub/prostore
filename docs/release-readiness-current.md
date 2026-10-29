# Current release readiness — 2026-10-29

This supersedes historical hosting-access and gap-count statements in earlier milestone reports. Scope: metadata-only hosting inspection and isolated diagnostics. No secret values were requested, no existing database was connected, and no settings, deployment, worker or provider operation was performed.

## Hosting evidence

Authenticated Vercel inspection succeeded for Erang's projects / prostore (Next.js, Node 22.x).

| Candidate | Commit | Observed state |
| --- | --- | --- |
| Production | `52948fad457ceeb2eb67dfbdd9fd90812de06333` | READY, deployment `dpl_Dw2gE9BLEgtKJyXCe5oXcXEofKZu`; listed rollback candidate |
| Earlier minimal storefront staging | `daba0b0e651cd23e433b67db6e9f5b49841c1c52` | READY, `dpl_Cap7r5YduN1JeTnofS1pJ2SnMZyr` |
| Latest minimal storefront staging | `4c7ff3d8f355c2471b5d32baab9f5f78940d80a3` | CANCELED, `dpl_C9KXMoFpEdUGXbe9TEiXQWLeHmkq` |
| Full seller/landing stack | `b2b6348e01ecbea0c9b21f89c57f07c555ac3163` | No deployment in the inspected latest-six deployment list; draft PR16 remains the source candidate |

Canceled is not a failed build or proof of readiness. The older READY candidate lacks the latest route-slug fix. Parent coordinates the standalone storefront release; no promotion occurred here.

Environment listing used `decrypt:false`; only names/types/scopes were considered. The single DATABASE_URL record targets production, preview and development with no branch-specific target shown. Payment/SMS configuration and NEXTAUTH_SECRET also span these environments. Custom-environment listing returned none. A deployment labelled staging therefore does not establish database or provider isolation. Values, database host, schema, applied migration history, callback origins and credential validity remain unknown. Preview tracking remains subject to the previously supplied OFF evidence; the normalized project response did not expose that switch, and no settings were changed.

## Independently corrected diagnostics

- Static config validation now accepts NEXTAUTH_SECRET as supported by installed `next-auth/lib/env.js`. AUTH_SECRET retains nullish precedence; an explicitly empty preferred value is an error, and a short effective value warns. Neither value is printed. This fixes a false failure against existing configuration names, without endorsing actual secret entropy.
- Release preflight now includes SellerRegistration, SellerNotice and SellerNoticeEvent. Exact ordered, valid, ready, nonpartial/nonexpression unique indexes are checked for payment references, order notification events, seller registration ownership and seller notice events. Name presence or a partial index is insufficient.
- Worker health includes aggregate seller-notice state, due counts, leases and provider-acceptance timestamps, without contacts or message bodies. It does not establish that a runner exists or that SMS was delivered.

All SQL remains operator-invoked READ ONLY. Run only against an independently authorized isolated staging baseline, with a bounded statement timeout and read-only role. Do not point these tools at a shared production URL merely because its environment label says preview. Missing schema diagnostics are not instructions to create guessed ledger/payment history.

## Executed checks

455 unit/action tests; 174 PostgreSQL tests on the actual 54-file migration chain; synthetic backup/restore of 17 tables with matching schema/constraints; typecheck; lint with existing warnings; independent source review. The new adversarial PostgreSQL test replaces seller uniqueness with a partial index and renames the latest event table inside a deliberately rolled-back disposable transaction, verifies both are detected, then verifies restoration.

No application/UI/schema migration changed in this diagnostic tranche. The preceding full optimized JS-adapter/font-fixture build and complete browser validation at the landing milestone remain evidence for that application code, not native runtime proof. They were not needlessly rerun for these scripts/docs-only changes.

Installed workspace Prisma/client are 6.19.2. No native schema/query engine was found in installed workspace engine/client packages. The previous denied native download was not retried; no alternative download route, credential or inaccessible cache was used. Native client execution and `prisma migrate deploy` are **not run**. Historical SQL replay and the test-only JS adapter are not substitutes.

## Smallest next steps and boundaries

1. Minimal storefront: parent verifies why the latest candidate was canceled and safely stages the exact `4c7ff3d` source under the already reviewed read-only build contract, then validates encoded product routes and rollback before any promotion. This task did not create that deployment.
2. Full stack: an owner must identify an isolated database/read-only baseline source. Supply metadata-only preflight results and migration names/checksums/completion state, not credentials or customer rows. Current shared environment metadata cannot establish this. Do not apply the 54-file chain blindly to populated data.
3. Provide a legitimate isolated Node22/native-Prisma runner with the required official engines already available. Rehearse migration adoption, backup restoration, application workflows and rollback with synthetic or appropriately sanitized data before full-stack staging.
4. Payment and SMS acceptance require provider-confirmed non-chargeable test arrangements. Approve and validate separate order-outbox, seller-notice and reconciliation runners before promising notifications or recovery; none is activated here.
5. Keep withdrawals/refunds execution gated until allocation/eligibility/fees/destination/evidence policies are decided. Confirm the existing delivery charge policy for multi-seller orders. Prior credential-history remediation remains owner-led and is not cleared by new-diff scans.

No action in this tranche was denied or had an uncertain mutation outcome. Actual database baseline and native execution are pending prerequisites, not passed checks. The preserved draft branches and production remain unchanged.
