# Buyer, seller and admin workspace reporting

Follow-up to local multi-seller commit a895ab342d33aebc952093925c7444d945f7e81b. No schema changes or live operations.

## Implemented

- Seller overview uses the existing database-scoped monthly/daily series instead of invented chart points. Monthly ordering is chronological across years. A real empty history displays an empty state; a failed read or revoked scope displays an unavailable alert before any money or charts.
- Labels identify paid item value (excluding order shipping/tax), grouped by order creation date, separately from pending escrow and available wallet funds. This is not net revenue or withdrawal reporting. Customer counts refer only to buyers in this seller's paid transactions; no expanded customer profile access was added.
- Awaiting-dispatch count includes both paid and preparing item states. Buyer order list shows canonical `isPaid` and received/total item counts, matching partial multi-seller fulfillment.
- Admin dashboard API requires the current database role, and its audit-log relation selects only profile fields used in the response. Admin fulfillment pages already use the same persisted-role guard.

## Validation

256 unit/action/component tests across 29 suites passed. 57 disposable PostgreSQL tests passed, including per-seller value/wallet/escrow reconciliation after partial receipt and rejection of another seller's summary scope. Typecheck and lint passed (existing unrelated lint warnings remain). Independent read-only diff review identified the unavailable-versus-empty issue, verified its fix and found no further concrete issue. Reviewer did not run application tests.

Final full optimized build and all disposable browser assertions passed: `/tmp/prostore-workspaces-browser3.log`, staging evidence `/tmp/prostore-browser-TDuJoM`. Mobile screenshots `buyer-partial-summary-mobile.png`, `seller-summary-mobile.png`, and `multi-seller-{buyer,supplier,admin}-mobile.png` were inspected. Unit log: `/tmp/prostore-workspaces-unit-final.log`; PostgreSQL: `/tmp/prostore-workspaces-postgres2.log`. An intermediate build caught an unused catch binding introduced by redacted logging; it was fixed and final lint/build passed. The browser test includes buyer partial receipt, the actual seller chart, revoked seller summary access and revoked admin API/page access, in addition to the full checkout/fulfillment regression workflows.

All database tests use disposable synthetic PostgreSQL and a test-only Prisma JS/pg adapter. Build/browser use local font fixtures and mocked providers; these do not establish native deployment engine or provider sandbox acceptance.

## Remaining specific work

- Native deployment Prisma runtime remains unvalidated because the earlier official engine download was denied; no bypass/retry was performed. An authorized CI/staging runner with the official dependencies is needed.
- Provider sandbox acceptance (including phone-only fallback email behavior) requires an approved sandbox integration; mocks are not acceptance evidence. Preview Branch Tracking stays off because prior configuration exposed a shared database URL to previews.
- Manual dispatch is not carrier tracking. Delivery remains buyer/admin confirmation; no shipping bookings or fabricated carrier events were added. SMS dispatch notifications are best-effort, without a durable outbox.
- Existing buy-now path `createBuyNowOrder` / `place-order2` still prices from product base price rather than applying quantity tiers, unlike canonical cart checkout. This discovered parity issue was not expanded into the current reporting tranche.
- Refund/dispute resolution and broader reporting scalability remain separate work; current charts read the seller's paid item history and are not refund-adjusted cash accounting.
- User-deferred unsigned WhatsApp bot integration remains unchanged. Separate NestJS repository remains unchanged.

The new fulfillment/reporting commits remain local pending appropriate publication approval. PR3 contains only the previously authorized storefront commits and is stacked on draft PR2. No merge, deployment or production migration occurred.
