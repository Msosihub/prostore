# Manual withdrawal and refund reviews

Base: `fc782d5a01eb06a31b0ebb75c6d290ded01af547` (notification outbox).
Branch: `feat/manual-money-review`. Local engineering only; not published or deployed.

## What is implemented

Six real route pages (three lists and three details):
- `/supplier/withdrawals` and `/supplier/withdrawals/[id]`: seller-owned wallet, active reservations, available balance, submission, history and cancellation.
- `/user/refunds` and `/user/refunds/[id]`: own paid order items, quantity/reason submission, item-value snapshot, review status/history and cancellation. The item selector covers the latest 50 paid orders; older purchases require support.
- `/admin/money-review` and `/admin/money-review/[id]`: platform review queue, status filtering/pagination, seller/requester IDs, wallet/reservation context, original order link, item/dispute context and reasoned decisions.

Fresh database roles and ownership guard all reads/writes. Admin seller-directory search now supports a complete seller UUID for the case link. No private contact, account destination or credential fields are returned by these review views. Reasons are plain text with length limits; operators/users are instructed not to include private account details. No new SMS or other external notification is sent.

## Financial invariants and intentional gates

- Money uses exact decimal strings/Prisma Decimal, never floating-point arithmetic. Withdrawal amounts must be positive and fit existing Decimal(12,2). This is a storage invariant, not a business minimum.
- Active withdrawal cases (`REQUESTED`, `UNDER_REVIEW`, `APPROVED`) reserve wallet funds. **Wallet and escrow balances and existing SupplierLedger rows do not change.** Available = wallet minus active reservations; no funds are taken twice. Case/event history is the reservation journal, not a fabricated payout ledger.
- Supplier row locks serialize reservations/reviews. Reject/cancel releases the reservation by one state transition, with an atomic append-only application audit event. Approved requests may be rejected/cancelled because no external execution is possible. External workers must not be attached to this workflow without redesigning the execution/confirmation boundary.
- Legacy non-rejected `PayoutRequest` records, including `TRANSFERRED`, block new withdrawals/approval until accounting is reconciled. No legacy rows, balances or states are imported, reset or inferred as safe.
- Active refund cases for a seller block new withdrawal requests and approvals. Previously approved reservations remain held; there is no transfer endpoint. This conservative review gate does not claw back already released/withdrawn funds.
- Refund requests bind to the authenticated buyer's paid order and an immutable order item. Quantity and requested merchandise value cannot exceed the remaining non-rejected/non-cancelled item quantity or the order total. Multiple sellers retain independent item allocations. Existing `APPROVED`/`REFUNDED` legacy return records gate further requests for that item.
- A matching non-legacy `SETTLED` PaymentAttempt marks the snapshot as provider-verified. Older paid orders can submit a **review case**, explicitly marked verification required. Their requested item value is not represented as an approved/refundable entitlement.
- **All refund financial approvals are unavailable**, also enforced by a database CHECK constraint. Shipping/tax/commission allocation, previous external refunds, released funds and execution verification are not guessed. No partial or full refund is executed.
- Refund cases serialize on the same parent Order lock as delivery. Active cases block affected-item/whole-order escrow release. A delivery that wins the race may complete before the case is submitted; the resulting delivered-item case is review-only and never reverses money. Closing a case does not close a separate ReturnRequest dispute or undo its delivery restrictions.
- Actor/request UUID uniqueness gives replay-safe submission; changed details with the same key are rejected. The browser retains the key across same-page interrupted retries. After a reload, inspect existing cases before submitting again; no cross-session draft persistence is claimed.
- No “mark transferred/refunded” action, free-form payment evidence, bank-account collection, payout/refund provider request, scheduler or automatic external execution exists. `APPROVED` means withdrawal review approved with reservation retained, **not money sent**.

## Schema and rollout

Additive `20261027000000_manual_money_review` creates MoneyReviewCase and MoneyReviewEvent, restrictive actor/supplier/order references, uniqueness, indexes and financial shape/state checks. Prisma relations match the restrictive SQL references. Existing payout/dispute history is preserved.

Apply only after the preceding chat, OTP, payment-recovery and notification-outbox migrations have been validated against the real staging baseline. Disposable tests exercise this additive SQL against synthetic current-schema fixtures; they do not prove the entire historical migration chain. Release preflight now includes both case tables; synthetic backup/restore verifies both tables and constraints.

Deployment remains gated by the earlier outbox worker setup/validation. Do not deploy queue-only notification code without an approved operating worker. Native production Prisma runtime/provider acceptance remain separate unresolved release checks.

## Validation

- Unit/action suite: 381 tests / 35 suites passed.
- PostgreSQL suite with backup fixture: 152 tests passed, including duplicate/concurrent holds, cap/quantity enforcement, review/reject/cancel races, role revocation, cross-seller reads, legacy payouts/refunds, delivery/refund races, audit rollback and admin-only field selection.
- Synthetic backup/restore: 14 critical tables plus schema/constraints matched, including one review case/event; 81,916-byte in-memory dump, SHA256 `6dc42d95a9c6f292dae24c92c3c63badd0a9a91d6a1fd9046829107efa60a5d0`. Dump was not retained; disposable databases removed.
- Fixture typecheck passed. Lint passed with pre-existing unrelated warnings.
- Full optimized fixture build and all browser workflows passed. New UI → action → database checks cover seller reservation, admin approval with no transfer, owner cancellation, cross-seller detail denial and buyer delivered-item refund review with approval gated. Mobile overflow assertions pass for buyer/seller/admin. Validation uses the existing test-only JS Prisma/pg adapter, local font fixture, synthetic data and blocked/mocked external calls. It is not native deployment/provider acceptance.
- Final schema-only regression: 151 PostgreSQL cases passed after explicitly matching Prisma `onUpdate: NoAction` with the SQL foreign keys.
- Visual QA caught and fixed buyer mobile header overflow. Three inspected, section-only screenshots (synthetic amounts/identities, no contact footer) are under `/workspace/prostore-staging/prostore-browser-7RVMe3/`: `withdrawals-mobile.png`, `refunds-mobile.png`, `money-review-admin-mobile.png`. Local QA artifacts only, not uploaded attachments or a running preview.
- Logs: `/tmp/prostore-money-unit-final.log`, `/tmp/prostore-money-pg4.log`, `/tmp/prostore-money-pg-schema-final.log`, `/tmp/prostore-money-types3.log`, `/tmp/prostore-money-lint-final.log`, `/tmp/prostore-money-browser-final.log`.
- Resolved intermediate failures: advisory-lock void deserialization (use executeRaw), React ref typing, accessible select targeting, and nested temporary build-root module resolution. No unresolved failure remains in executed fixture checks.
- Independent read-only financial review identified missing admin identity and schema relation drift; both fixed and re-reviewed with no remaining financial/privacy blocker. Reviewer inspected tests but did not execute them.

## Policy and integration decisions still needed

1. Withdrawal eligibility, minimum/maximum and fees (if any), verified destination management, reviewer/executor separation, reserve expiry/review service expectations and treatment of legacy withdrawals. No business thresholds were invented.
2. Refund eligibility/deadlines, return-condition/evidence process, partial quantities, tax/shipping allocation across sellers, platform commissions, chargebacks, and handling funds already released/withdrawn. Independent provider-paid/refunded totals are required before enabling execution.
3. Provider-backed idempotent transfer/refund submission, authoritative evidence reconciliation, ambiguous outcomes and completion accounting. Human approval alone is insufficient to assert payment.
4. Retention/privacy policy for case reasons/audit events and production operator procedures. No automatic deletion or notification recipients were introduced.

All new financial execution is intentionally unavailable until those boundaries are designed and verified. No live data, transfers, credentials, provider calls, security settings, deployment, merge or Mac preview was changed.
