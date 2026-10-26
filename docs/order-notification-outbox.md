# Order notification outbox and restore readiness

Base: de18f001916257745103ddacad3cee20697ec129 (payment recovery, draft PR #8). This local tranche does not enable a worker, scheduler, live provider or deployment.

## Durable intent and recipients

Settlement now queues one buyer-payment and one seller-payment event per seller inside the existing inventory/escrow transaction. Delivery queues one seller-release event per item inside its release transaction. Dispatch queues its buyer alert with the dispatch/event transaction. The existing seller reminder now records one idempotent reminder per order item; repeated requests do not create extra SMS. Additional reminder cadence is a product decision, not an automatic retry policy.

OrderNotification holds a unique event key, order/recipient entity IDs, optional product ID, state, capped attempt count, lease, provider message ID and timestamps. It does not store phone numbers, free-text message bodies, raw provider responses or credentials. A separate event table records sanitized transitions and the actor for manual retries. Rendering uses canonical order snapshots and existing templates/recipient rules, never caller-supplied recipients. Seller alerts are limited to current supplier-role accounts and their own applicable items. Delayed seller-payment alerts include remaining actionable escrow items rather than making stale claims about released funds; stale dispatch/reminder events are suppressed after delivery or active dispute.

The marketplace had no order-SMS preference. The legacy support notification tables use a different identity domain and are not repurposed. User.orderSmsEnabled defaults true to preserve the existing transactional behavior, not to assert new marketing consent. Buyers and sellers can change their own preference at /user/notifications, linked from both profile areas. It does not control login OTP. Workers recheck preference/role at processing time. Account opt-out suppresses pending messages; messages already in flight may still arrive. Provider opt-out code 406 also disables the relevant account's order-SMS preference. Re-enabling preferences does not replay suppressed rows. No marketing recipients/templates were added.

## Delivery semantics and retries

- QUEUED: durable intent; no external send established.
- SENDING: a worker owns a 90-second lease; the claimed attempt is recorded before IO.
- ACCEPTED: a correlated single-recipient provider response with status 100/101/102 and message ID. This is NOT handset delivery.
- RETRY: an explicit provider rejection 500/501/502, with 1/2/4/8-minute backoff and five attempts maximum.
- FAILED: known route/config rejection, missing valid recipient or exhausted attempts. Fixing the underlying issue is separate from requeueing.
- UNKNOWN: network/malformed response or an expired in-flight lease. It is never automatically resent. Admin retry requires explicit duplicate-risk acknowledgement and remaining attempt budget.
- SUPPRESSED: opted out, revoked seller or event no longer applicable. Admin retry cannot override it.

All final writes are fenced by lease token/state. Expired workers cannot overwrite newer review state. A crash after external acceptance but before recording it cannot be distinguished from an unsent request: exactly-once external SMS is NOT guaranteed. The unique event row prevents duplicate local intent; it is not provider idempotency. No delivery-report callback or delivery claim is implemented.

Provider contract sources: https://developers.africastalking.com/docs/sms/sending/bulk and https://help.africastalking.com/en/articles/16150386-messaging-error-codes . These distinguish immediate acceptance from later handset delivery. No actual SMS/provider call was made during engineering; tests mock transport.

## Operational entrypoints and release gates

1. Review/apply additive migration 20261026203000_order_notification_outbox on authorized staging, after preceding chat/OTP/payment migrations. It adds outbox/history and the preference, without backfill or replay of historical messages. Do not deploy this code before the tables/column exist.
2. Run scripts/release-preflight.sql only against an explicitly authorized staging connection. Every presence result must be true. This checks relevant current schema/index shape, not migration history. Existing scripts/check-release-config.cjs remains stdin-only and never reads credentials implicitly.
3. Run scripts/notification-outbox-dry-run.sql for a bounded contact-free queue report. notificationBatch() is server-only and defaults to dryRun:true, limit 20, maximum 50. A trusted runner must explicitly choose dryRun:false to process sends. No public worker endpoint, cron, scheduling configuration or credentials were added.
4. Before any deployment, assign an operational owner and validate an approved staging worker/monitoring cadence, provider account/sender acceptance, and stop/recovery procedure. Inline order sends have been removed: without a worker, messages safely remain queued. This is a hard release dependency, not a claim that notifications are already being delivered.
5. Admin /admin/notifications exposes filtered/paginated minimal status/history and reviewed requeue. It checks current database ADMIN authority and never directly sends a message. Five attempts cannot be reset or bypassed through the UI.
6. notificationRetention defaults to dry-run and removes only bounded terminal ACCEPTED/SUPPRESSED history older than an explicit cutoff at least 90 days ago. It preserves unresolved records and all unique outbox rows/tombstones, so replay cannot recreate a send. No retention job is enabled. The 90-day floor is a technical guard; a real retention policy still requires operational approval.

## Disposable backup and restore

Run npm run test:backup:restore. The harness creates only its own labeled localhost-bound tmpfs PostgreSQL 16 container, generates the established test-only JS/pg Prisma client and exercises the fixture schema plus actual recent additive migrations. The last test creates a synthetic settled/delivered order, credit/release ledgers, durable payment proof/history, notification intents/history and audit record.

The restore verifier accepts only the harness container name/label/tmpfs declaration. It uses pg_dump custom format in memory and pg_restore into a newly created separate database inside that same disposable container. It compares column/default/nullability shape, constraint definitions and ordered row digests/counts across 12 critical tables. It prints only counts and archive size/checksum, not row values. The archive is not saved or uploaded. The container and both databases are removed by the harness even on failure.

This proves current disposable fixture backup/restore, not restoration of production data, all legacy integration models, the full historical migration chain, recovery timing/SLA, managed-provider snapshots, encryption-at-rest policy or native deployment Prisma execution. Native engine download 403 remains a known blocked validation path and was not retried.

## Validation and remaining decisions

Final exact results are recorded below. Existing financial invariants and role/isolation suites remain in the aggregate run. Independent review identified and verified fixes for delayed partial seller alerts and revoked seller recipients.

Remaining business decisions are separate: who approves refunds/dispute resolutions and evidence deadlines; how partial refunds allocate shipping/tax/fees; payout eligibility/frequency/approval and provider reconciliation; repeat-reminder cadence. No policy, transfer, refund, carrier assumption or live security setting was invented or changed. Legacy bot/Chatwoot and separate NestJS remain unchanged.

## Final executed evidence

- 365 unit/action tests passed (34 suites): /tmp/prostore-outbox-unit-final.log.
- 138 disposable PostgreSQL tests passed, including the dedicated backup-fixture test: /tmp/prostore-outbox-backup-verified.log. Ordinary financial/outbox coverage includes rollback, concurrent claim/enqueue, expired lease/crash, redaction, retry cap, missing routes, opt-out/revocation, partial seller fulfillment, reminder replay/dispute, retention boundaries and existing-user migration default.
- Generated fixture-client typecheck and lint passed; existing unrelated lint warnings remain: /tmp/prostore-outbox-types4.log and /tmp/prostore-outbox-lint.log.
- Full optimized isolated build and every browser workflow passed: /tmp/prostore-outbox-browser.log. New UI checks covered unknown-outcome acknowledgement/requeue without sends, mobile layout and own-account SMS opt-out/opt-in persistence. The synthetic screenshot /tmp/prostore-browser-5IpSFs/order-notifications-mobile.png was inspected. It is local QA evidence, not a published preview or Library attachment.
- Independent read-only review found no remaining concrete blocker after the two recipient fixes. New material credential-pattern scan found zero matches; this is not a claim of a full historical secret audit.
- Final custom-format synthetic dump size 72,237 bytes; SHA-256 62ec2b4517ecbdd446b6a986a6cf77e60763f7550a05c18f435f2e727623ad3e. Restore matched schema/constraints and 12 critical table digests, including one order, two ledger rows, one payment attempt/three events, three notification rows/three events, one audit record and one delivery-feedback record. The dump was consumed in memory and not retained; both disposable databases/container were removed.

Build/browser evidence uses the established test-only JS/pg Prisma adapter and local font fixtures, with external providers mocked/blocked. It is not native target-runtime, live SMS, provider sandbox or production migration acceptance. No Mac demo, separate NestJS repository, Preview setting, production database, credentials or security settings were changed. This new tranche remains local pending parent review/publication authority.
