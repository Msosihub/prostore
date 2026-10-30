# Durable payment recovery

Local tranche based on c2381f9ccb761db86c70db590c1dbf414c9a03f7. No deployment, live migration, provider call or scheduled worker was performed.

## Implemented contract

ZenoPay collection still uses the existing configured v1 host/contract; no provider guarantees or hosts were invented. The order reservation and PaymentAttempt/event creation commit together before collection. A unique order binding deliberately permits only one collection attempt per order under the current no-recharge policy. The history records verification and recovery events, not arbitrary new charge attempts. Provider order references are globally unique; provider transaction references are unique per provider. Amount is the canonical order total in implicit TZS.

AMBIGUOUS means a reserved request may or may not have reached the provider. It is never authorization to collect again. PENDING and FAILED come from authenticated status lookup. FAILED cannot downgrade verified payment; a later verified completion can recover a failed attempt. Incoming callback text is only a hint. Exact local/provider order ID, positive exact amount and nonempty completion reference are checked before durable proof is committed.

VERIFIED records provider proof separately from inventory/escrow. The same transaction marks the unfulfilled order REQUIRES_REVIEW, so a crash does not leave a previously failed label on verified money. Local canonical settlement remains atomic and idempotent. Stock shortage, legacy ledger conflicts and other settlement failures produce REVIEW, not a false payment failure or automatic refund. After restock or an interrupted commit, the stored validated proof can retry local settlement without another provider lookup. No stock strategy, refund policy, payout or commission calculation was changed.

All callbacks, owner refreshes, admin refreshes and internal batch operations share a persisted 30-second cooldown and 90-second lease. Network calls do not hold DB locks. Expired workers cannot overwrite a newer state; SETTLED is terminal. A concurrent request can receive an AMBIGUOUS/PENDING snapshot while verification is in progress. Callback hints arriving during cooldown receive a retryable 503 rather than a false successful verification acknowledgement. Provider redelivery is not assumed; manual refresh or a later operator batch may still be needed. No unattended reconciliation scheduler is enabled in this tranche.

Existing bound references are adopted on demand without a new collection. Existing paid records are marked legacyPaid and remain review-only even after repeated provider verification: their prior stock/escrow state cannot be safely inferred. Unbound/unsupported legacy results are not reset or charged. Legacy audit candidates link to the existing admin order page; the full read-only inventory/ledger diagnostic remains scripts/reconciliation-report.sql. Pesapal initiation is still absent; its existing verified IPN/shared settlement path is unchanged and not represented as a newly supported recovery gateway.

## User and operator surfaces

- POST /api/zenopay/status authenticates the owner or explicitly requested current database ADMIN role. It never initiates collection. Other buyers and revoked admins are denied before provider lookup.
- Buyer order details offer Check existing payment, truthful pending/review text and a no-second-payment instruction.
- /admin/payments lists/filter/paginates attempts; /admin/payments/[id] shows verified payment versus local settlement and the latest 50 sanitized history events. No customer contacts or raw provider payloads are included.
- Admin order details expose the same status check for existing ZenoPay references, including legacy review candidates.
- lib/payment-recovery.ts reconciliationBatch defaults to dryRun=true, accepts 1–50 records and isolates failures per record. It is server-only, not a public action, cron or enabled scheduler. Wiring a trusted scheduled runner requires a separate operational decision.
- scripts/payment-recovery-dry-run.sql is a bounded operator preview with an explicit READ ONLY transaction. It neither connects by itself nor invokes providers. Run psql only against an independently approved database/snapshot; do not reuse production environment defaults.

## Migration and deployment gate

20261026193000_payment_recovery adds PaymentAttempt and PaymentAttemptEvent, constraints/indexes and restrictive order relations. It does not backfill, rewrite, repair or delete legacy records. Restricting deletion preserves payment evidence. Apply/review this additive migration in authorized staging before deploying code that reserves attempts. The earlier OTP/chat migrations are dependencies. Only disposable synthetic PostgreSQL received this migration during engineering.

## Validation

344 unit/action tests and 118 disposable PostgreSQL tests passed, as did the generated fixture-client typecheck and lint (existing unrelated warnings remain). Independent read-only review found no remaining concrete blocker after fixes for lease fencing, saved-proof retries and admin input/pagination. The full optimized isolated build and all browser workflows passed. Final evidence: /tmp/prostore-recovery-unit-complete.log, /tmp/prostore-recovery-pg-last.log, /tmp/prostore-recovery-types-last.log, /tmp/prostore-recovery-lint-last.log and /tmp/prostore-recovery-browser-complete.log. The synthetic mobile recovery screenshot at /tmp/prostore-browser-zbS6xy/payment-recovery-mobile.png was inspected; no horizontal overflow or customer contact fields. Disposable services/database were stopped/removed by the harness. Temporary build-storage exhaustion was resolved by deleting only completed staging build caches; earlier browser assumptions about cooldown and the reused synthetic provider reference were corrected. Regression coverage includes concurrent reservation/callbacks, provider-reference uniqueness, missing/mismatched proof, failed/completed statuses, stock shortage/recovery, crash after settlement, persisted proof with provider offline, expired lease worker, legacy paid replay denial, owner/other buyer/revoked-admin boundaries, pagination/UUID input and read-only SQL execution. Browser additions exercise pending status without a second collection, admin attempt detail and mobile layout.

The build/browser harness uses the established test-only JS/pg Prisma adapter, synthetic fixtures, local fonts and mocked/blocked external providers. It is not native deployment-engine validation or provider acceptance. Native engine download 403 remains unresolved and was not retried. ZenoPay composite reference and phone-only payments.invalid acceptance remain unverified. No safe provider sandbox account/instrument was supplied. No actual payment, SMS, deployment, credential or security-setting change occurred.

## Explicit remaining limits

- Notification dispatch is still the existing post-commit best-effort SMS behavior. There is no durable notification outbox or exactly-once notification delivery claim; a crash may lose notification delivery. This is deferred to a separate transport/delivery tranche.
- No automatic collection retry, refund, payout, reversal handling policy or legacy financial repair.
- No scheduler is activated. Operator ownership/frequency/alerting and event retention must be agreed before unattended operations; the service and dry-run report are ready for controlled staging use.
- An order under REVIEW does not yet contribute to old isPaid-based seller revenue totals until canonical stock/escrow settlement completes. Recovery pages explicitly expose the distinct verified-payment fact.
- Unknown WhatsApp bot, legacy Chatwoot contact policy and separate NestJS remain unchanged.
