# Admin operations tranche

Branch: `feat/admin-operations`. Base: `4c8319e21109a6e8dc3e372be87af14bc618c497` (published chat PR5). Local engineering only; no push, merge, deployment, live migration or external calls.

## Intended responsibilities and verified gaps

The existing admin routes manage supplier profiles/verification, uploaded documents, categories/subcategories, brands, banners and audit history. Earlier fulfillment work added admin order details. The admin is a platform overseer, not a buyer/seller tenant; reads and writes require a fresh database-confirmed ADMIN role.

The original overview used catalog/user counts and supplier ratings, had an empty map and no operational dispute/payment queue. Its "top performing" label was not backed by transaction performance. Order listing stopped at 50 records without search/pagination. Documents showed all unverified records (including rejected submissions), ignored seller drill-down scope and capped results. Session-only guards remained across admin APIs, and brand/banner mutations lacked any guard. Supplier email edits accidentally wrote the location field. Document decisions and audit records were separate commits; optional automatic verification did not require all configured document types to exist.

## Implemented

- `/admin`: server-rendered operations overview using a repeatable-read snapshot. Unpaid orders, open return requests, pending documents and unverified sellers link to appropriate queues. Recorded paid order value includes shipping and is explicitly not net/refund-adjusted revenue. Held seller balances and available wallets are distinct, not sales/profit.
- `/admin/orders`: product-name/exact-order-ID search, paid/unpaid/unconfirmed-fulfillment filters, stable 20-row pagination, zero-result recovery and per-order multi-seller received-item counts. No buyer contacts or provider payloads in the list.
- **New route `/admin/disputes`**: oldest-first, paginated status queue linking to existing item/fulfillment details. It intentionally cannot resolve disputes, refund, or release escrow: no existing complete refund-resolution contract was found.
- `/admin/documents`: oldest-first paginated pending/approved/rejected/all queues, seller scope preserved in pagination, all safe deduplicated stored attachment links plus document type/description. Confirmed approve/reject controls with pending/error states. A nonblank bounded rejection reason is required server-side.
- Document review and its audit commit atomically. A shared supplier row lock serializes decisions before checking the existing optional auto-verification policy. Every configured required type must exist and all matching documents must be approved. No policy setting was changed. Existing behavior does not automatically revoke a verified seller after a later document rejection; that remains a distinct seller verification decision.
- Responsive persistent admin navigation, active-route state, skip link, database role gate, loading/error boundaries. Existing seller/catalog/audit workspaces remain accessible; brands now have a navigation entry.
- Fresh database-role authorization on the existing administrative APIs; previously open brand/banner/banner-item mutations now require ADMIN. Public catalog GET routes remain compatible. No session claim grants administrative mutation authority.
- Supplier email form wiring corrected; unverified-seller drill-down propagated. Removed raw brand input and supplier-update payload logging in touched paths.
- Disposable fixtures now include Admin, AuditLog and SupplierDocument. Browser Back navigation waits tolerate temporarily absent search inputs. These were demo fixture/test gaps, not missing production tables.

No schema migration was needed. No changes to payment settlement, buyer/seller ownership, external NestJS or the deferred bot.

## Validation

- 335 unit/action tests, 32 suites passed, including anonymous/stale-role operational reads, revoked-admin catalog/verification mutations, allowed admin brand creation, paging normalization and minimal list projections.
- 81 disposable PostgreSQL tests passed. Added canonical overview arithmetic, order filtering/paging, terminal/open dispute behavior, mixed document status/supplier queues, required-type policy and concurrent final approvals with one auto-verification audit.
- Source typecheck passed with the generated test Prisma client (`/tmp/prostore-market-tsconfig.json`). Lint passed with pre-existing warnings; `git diff --check` passed.
- Independent actual-diff review found queue-link mismatch, lost multi-file review context and document decision concurrency issues; all corrected and re-reviewed, no remaining concrete blocker. Reviewer did not independently execute tests.
- Initial optimized isolated build/browser pass covered overview/mobile overflow, search/empty recovery, disputes and revoked-role mutations. Final optimized build and all browser workflows passed, including multi-file document review and confirmed approval with database audit. Final staging artifacts: `/tmp/prostore-browser-M7WSsR` (database removed). The preceding final attempt failed because a duplicate test dialog handler accepted the same confirmation twice; the redundant handler was removed. This was a test harness correction, not an application failure.
- Screenshots are internal synthetic QA. Original full-page captures include the global footer's public contact information and are not deliverables. Final captures target only admin content.

Evidence: `/tmp/prostore-admin-unit-final.log`, `/tmp/prostore-admin-postgres.log`, `/tmp/prostore-admin-types-final.log`, `/tmp/prostore-admin-lint-final.log`, `/tmp/prostore-admin-browser-final2.log`.

## Remaining limitations and useful follow-up

Native Prisma deployment runtime remains unverified due to the previously denied official download. No retry or alternate download route attempted. Full isolated build/browser validation uses the established test-only JS/pg adapter, local font fixtures, synthetic PostgreSQL and mocked external services. This is not provider acceptance or production readiness certification.

Dispute resolution/refund policy and provider refund implementation still require a deliberate supported workflow; this tranche provides visibility only. Manual supplier profile/verification mutation and deletion still use the older API workflow; broader atomic audit/validation improvements there are separate follow-up work. Historical audit details remain as stored. Existing catalog GET compatibility was preserved rather than redesigning those APIs. The existing optional document policy does not revoke seller verification automatically; no new revocation policy was invented.

The previous supplier/dashboard screens were not wholesale redesigned. No claim of universal accessibility or production-scale load testing. Large platform-wide aggregates may eventually need measured indexing/operational sizing. No new paid service, credentials, persistent access or security configuration was created. The user's Mac demo was not accessed or changed.
