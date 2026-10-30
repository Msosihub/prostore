# Provider and worker launch gates

## Verified scope

The synthetic hosted release at `99a7bcee209aa86cfd94233b9e1504ff90c49ed0` passed native Prisma, 188 database regressions, an optimized build and 17 loopback browser workflows. See `synthetic-hosted-refresh-results.md`. Payment and SMS transports were mocked. This is not provider acceptance, production PostgreSQL 17 acceptance or proof of an operating scheduler.

Read-only staging environment metadata showed database, authentication, ZenoPay and Africa's Talking variable names, without inspecting values. Presence is not validity. No credentials, production data or provider settings were changed.

## Source safeguards

All three batch workers default to dry-run. Runtime options now reject non-boolean dryRun values before queries, provider calls or retention deletion; only explicit boolean false selects execution. Retention has the same guard. This is input validation, not runner authentication: any future runner must be trusted and access-controlled.

Worker health SQL now counts the same candidates as batch selection: queued/retry notifications below five attempts and due now, or expired sending leases; payment attempts must be non-settled and due. Expired SMS leases become UNKNOWN, not automatic resend. Candidate counts do not prove processing or delivery. Accepted means provider acceptance, not recipient delivery. External exactly-once SMS is not guaranteed.

## Required provider acceptance

1. **ZenoPay:** confirm the account supports the implemented `zenoapi.com` collection/status contract, approved non-chargeable test identities and webhook authentication/retry behavior. Verify initiation, pending, completion, failure, timeout/status recovery, duplicate callback and amount/order/reference mismatch handling. Confirm phone-only fallback email acceptance and completed-status reference semantics. Do not invent a sandbox URL or infer collection idempotency. Use separately approved test credentials through managed configuration, never pasted secrets. No real charge is authorized by this checklist.
2. **Africa's Talking:** confirm the configured application's username and sender authorization against the existing source adapter (fixed username/sender and live endpoint). Sandbox credentials and username differ from live credentials; current source must not be assumed sandbox-ready. A reviewed transport configuration and specific credential approval are prerequisites to a real sandbox send. Verify acceptance, rejection, opt-out and ambiguous timeout behavior with approved test recipients. Do not equate an HTTP success or mocked recipient with delivery.

Primary contract references: [provider-owned ZenoPay example](https://github.com/ZenoPay/zenopay-php), [Africa's Talking application/sandbox identity](https://help.africastalking.com/en/articles/2249244-what-is-my-username-and-api-key), [sandbox versus live authentication](https://help.africastalking.com/en/articles/1036048-why-am-i-getting-the-error-supplied-authentication-is-invalid). Examples do not establish this account's acceptance or business policies.

## Required worker operation

No application/script caller or scheduler for reconciliationBatch, notificationBatch or sellerNoticeBatch was found in this source. External scheduling is not proven. Without an approved runner, notifications can remain queued indefinitely.

Before activation, identify an owner, trusted runner, cadence, execution budget, monitoring destination and stop procedure. Start with read-only aggregate health and explicit dry-run; then validate a bounded synthetic batch. The sequential default batch of 20 can spend up to approximately 300 seconds on 15-second provider timeouts alone; maximum 50 can spend 750 seconds, plus database work. Select limits to fit the chosen runtime. Leases/fencing and ambiguous-outcome review remain mandatory. Do not expose unauthenticated dispatch endpoints or enable a live schedule from this document.

Alert on queue age, failed/UNKNOWN outcomes and expired leases; protect recipient/payload data in logs. Confirm retries and crash recovery in staging before enabling external sends. Keep retention separate, explicitly authorized and dry-run first; tombstones protect deduplication. Financial execution/refund policy gates remain closed.

## Next owner actions

- Obtain provider confirmation of supported test contracts and test identities (no secrets in chat).
- Approve the specific test credential setup only when needed, and choose the worker runtime/owner and monitoring destination.
- After provider acceptance and bounded worker validation, review production schema adoption, backup/restore, configuration isolation and rollback together before any release activation. Existing hosted demo remains synthetic; production is unchanged.

## Validation of this safeguard change

- 548 unit/action tests passed; typecheck and lint passed (existing lint warnings remain).
- 191 database regressions passed on each disposable PostgreSQL 16.15 and 17.11 database, replaying the historical/additive SQL chain. Both independent dump/restore checks matched schema/constraints and synthetic records across 18 tables.
- These local database suites use the test-only Prisma adapter, not native production-engine acceptance. The earlier hosted native result applies to the preceding staged SHA only.
- Direct tests reject malformed options before I/O and compare the actual health SQL with each worker's dry-run selection across terminal, capped, future and expired-lease states.
- Independent review found and corrected test ordering that displaced the terminal backup fixture. An initial diagnostic fixture mismatch was also corrected; final complete reruns passed.
- No UI changes: browser/full build were not repeated for this server-option/query-only change. No scheduler, external send, provider acceptance, production migration or deployment was run.
