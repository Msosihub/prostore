# Shared settlement and escrow-release invariants

Branch: `fix/zenopay-payment-reliability`. Review base: `8a94cfd`, following `f518603`.

## Verified problems and implementation

The prior active Pesapal IPN wrote `isPaid` without inventory/escrow fulfillment. Manual paid/COD actions used a separate stock-only transaction. Whole-order delivery directly shifted supplier balances without item-release ledger entries, while item delivery used a separate transaction. Delivery eligibility did not inspect return requests or terminal item states. Concurrent final-item confirmations used stale arrays to decide parent completion.

These paths now share two server-only services:

- `lib/order-fulfillment.ts::settleOrder`: ZenoPay, verified Pesapal and administrator-confirmed COD use the same conditional transaction for paid status, inventory, item state, supplier escrow and credit ledger. Gateway, attempt and amount are part of the claim. The existing `fulfillOrder` entry point remains a ZenoPay wrapper.
- `lib/order-delivery.ts::confirmDelivery`: buyer item confirmation, feedback confirmation, admin whole-order confirmation and the legacy `deliverOrder` action use the same release implementation. It locks the parent order before reading items, validates paid state/owner, checks each item and dispute, moves escrow and writes a unique release ledger in one transaction, and recomputes parent completion from current rows.
- `lib/order-delivery.ts::openOrderDispute`: dispute creation takes the same parent lock, checks paid ownership and unreleased item state inside the transaction, then writes the request/item state/event together. Feedback also commits with release rather than being saved ahead of a potentially failed delivery.
- Supplier dispatch takes the parent lock and uses a conditional item update, so it cannot overwrite a concurrent rejected or delivered state using an earlier snapshot.

All active `isPaid: true` mutations in the audited payment/action paths now occur in shared settlement. All audited pending-to-available wallet transfers now occur in shared delivery. Commented legacy copies were not made executable. Redundant old implementations and their adjacent obsolete commented variants were removed from `order.actions.ts` as the actions became thin authorization/revalidation wrappers.

## Payment compatibility and trust boundaries

- COD is explicitly limited to stored `CashOnDelivery`, `COD`, or `Cash On Delivery` methods. It still requires a current database-confirmed administrator. Generic manual payment actions cannot accept caller-supplied digital payment results or mark a ZenoPay/Pesapal order paid.
- Pesapal accepts stored `PESAPAL` or `Pesapal` methods and an exact stored tracking reference. Both legacy `paymentResult.id` and newer `trackingId` are supported; conflicting values fail closed. The IPN accepts documented PascalCase/camelCase request fields plus the old snake_case field, and supports GET and POST notifications.
- Pesapal's authenticated status response must report the exact merchant order, matching amount, TZS currency, consistent completed status/code and a nonblank confirmation code. Failed notifications retain the tracking record and use an unpaid, gateway-bound conditional update. Reversals are flagged for reconciliation, not treated as a simple failed/unpaid transition.
- `lib/pesapal.ts` uses the documented `orderTrackingId` query parameter, validates HTTP/JSON/envelope responses and bounds token/status calls with timeouts. It is now server-only rather than an exported token-returning server-action module.
- ZenoPay initiation cannot replace explicitly selected COD or Pesapal methods. Its verified amount is passed into shared settlement and included in the database claim.
- No new payment provider initiation flow, credential, deployment setting or schema migration was introduced. Pesapal initiation remains legacy/commented code; this tranche secures its existing notification path and supports correctly bound stored records. Unbound or differently labeled legacy records need review.

Provider reference: [Pesapal GetTransactionStatus and IPN response contract](https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus). Only documentation was consulted; no live or sandbox provider request was made. Phone-only `.invalid` fallback acceptance remains unverified.

## Release invariants

The lock is a parameterized `SELECT "id" FROM "Order" WHERE "id" = $1::uuid FOR UPDATE`. Item, whole-order, dispute and dispatch writers acquire it first. PostgreSQL READ COMMITTED readers then see preceding committed item changes, including the other final item.

Before a new release:

1. The order must be paid and nonempty; buyer confirmation must target an item on that buyer's order. Admin actions perform their role check before invoking the server-only service.
2. The item must be unreleased, in PAID/PREPARING/DISPATCHED, and in ESCROW payout state. REJECTED/RETURNED/CANCELLED cannot release.
3. REQUESTED/APPROVED/REFUNDED return requests block release even if item status is stale. A rejected return request does not itself block, but the item's status must independently be eligible.
4. The corresponding completed escrow credit must exist with matching supplier and exact decimal amount. An inconsistent existing release entry requires reconciliation.
5. A conditional item transition and supplier update with `pendingBalance >= amount` prevent duplicate release and negative pending balances. The release ledger is unique by order/product reference.
6. Item flags, balance transfer, ledger, optional feedback and final parent flag commit or roll back together. Whole-order confirmation is all-or-nothing if any unreleased item is blocked.

Duplicate confirmations skip already-delivered items and send no duplicate delivery notification. Notifications remain best effort after commit. A delivery that wins the lock prevents a later dispute from silently reopening released escrow; that case returns a support/review failure. A dispute that wins prevents delivery release.

## Validation

Final validation for this tranche:

- `npm test`: **113 passing unit/route tests across 12 suites**.
- `npm run test:payments:postgres`: **33 passing real PostgreSQL integration tests** using the disposable harness from the prior tranche.
- `npm run typecheck`: passed.
- `npm run lint`: passed with existing warnings.
- `npm run build:validate:offline`: passed (compile-only, local fixture font, no live credentials).
- `git diff --check`: passed.

New database coverage includes duplicate COD settlement; COD/Pesapal and COD/ZenoPay races; duplicate Pesapal notifications with both stored reference shapes; whole-order/item release races through the service and actual public actions; dispute/delivery races in both launch orders; simultaneous final-two-item completion; blocked item and return-request states; whole-order rollback when one item is disputed; insufficient pending balance; feedback atomicity/idempotency; foreign buyer/unpaid rejection; and administrator COD misuse against a digital order.

The tests execute real SQL at READ COMMITTED, but use Prisma's test-only JS engine/pg adapter and a subset fixture schema, not the deployment's blocked native engine or its historical migrations. Normal Google-font production build, browser end-to-end, native deployment runtime and actual provider/SMS acceptance remain unverified. No test database container was retained.

## Remaining work and operational constraints

- Previously paid legacy orders without escrow-credit records cannot safely release funds automatically. Previously delivered/partially released records and balance discrepancies require audited reconciliation; this code does not synthesize historical funds.
- Reversal/refund resolution is not implemented. Dispute approval/resolution and financial adjustments must use the same order-lock protocol when added.
- Notification outbox, scheduled payment reconciliation, persisted multi-attempt retries, provider lookup throttling, stock reservation and operational recovery tooling remain follow-ups.
- Cross-order deadlocks/timeouts can still require retry; the database rolls back the transaction. Tests establish the requested race safety, not exhaustive load/performance behavior.
- Actual COD collection is a trusted administrator attestation; it is not independently verified by a payment provider.
- Product-level supplier reassignment, credential-history review, existing compromised sessions/roles and remaining supplier/chat authorization concerns retain the earlier reports' caveats.
- No production data/service, existing database, live credentials, provider transaction or SMS was touched. No push, PR, merge, deployment or history rewrite occurred.
