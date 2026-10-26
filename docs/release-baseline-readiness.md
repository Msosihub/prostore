# Release baseline readiness — no production activation

Base: published manual-review commit `51763bd47298cd49fac554ab5f3013d6605095b9` (draft PR #10). Work is on local `chore/release-migration-readiness`; this tranche has not been published, merged or deployed. Mac previews remain untouched.

## Concrete fixes

1. **Withdrawal/refund retry identity survives a same-tab reload.** Session storage contains only the database-confirmed actor/kind scope, random request UUID and SHA-256 payload fingerprint, never raw reasons, amounts, contacts or account details. Unchanged retries recover the same key. Changed pending details require checking existing cases and explicitly starting another intent. Unavailable storage falls back to same-page memory; cross-tab/device recovery and recovery after clearing browser storage are not promised. Failed cleanup is detected, attempts a non-sensitive reset-required marker and blocks a new submission rather than claiming reset succeeded.
2. **Forward refund quantity constraint.** `20261027010000_refund_quantity_guard` adds explicit non-NULL enforcement for refund quantities. The older composite PostgreSQL CHECK could evaluate to unknown for NULL. Historical migrations are unchanged. Existing invalid rows make the new constraint fail; no row is silently repaired or deleted. Action validation remains in place.
3. **Notification retry explicitly refreshes the mounted filtered page.** Server-side `revalidatePath` remains, and confirmed client success also requests authoritative router data in a transition. The old row cannot be retried while refresh is pending. The browser regression requires a fresh RSC GET of the UNKNOWN-filtered page and then its empty state, without manual reload or optimistic row removal.

No financial execution, provider, recipient, fee, eligibility or allocation policy was enabled or changed.

## Migration audit: SQL replay succeeds, runtime baseline is incomplete

`npm run test:migrations:isolated` creates its own labelled PostgreSQL 16 container, with tmpfs storage, **no network and no published port**, and destroys it in finally. It accepts no database URL. It replays tracked migration SQL in lexicographic order with a transaction per file. A matching generated fixture client supplies model metadata; no native engine download is attempted. It then compares the resulting public schema with current model names/fields and enum names. Exit 2 means replay failure or critical runtime-shape gaps; exit 1 means a diagnostic/infrastructure error. This is SQL replay, not `prisma migrate deploy` or a claim about deployed migration history.

**Verified: all 52 files replay successfully**, including the 46 historical files through `20260521025145_payrole`, the five published additive chat/OTP/payment/outbox/money-review migrations and the new quantity guard. There is no incompatible SQL step in this empty-database replay.

**Blocked: successful replay does not produce the complete schema expected by the application.** The audit finds 91 table/column/nullability discrepancies, including these 13 launch-relevant gaps, plus two missing enums:

| Required object | Missing after the complete SQL chain |
| --- | --- |
| `User` columns | `chatwootAgentId`, `chatwootContactId` |
| `OrderItem` columns | `status`, `dispatchNote`, `dispatchedAt`, `buyerDeliveryComment`, `buyerDeliveryRating`, `rejectedAt`, `rejectionReason` |
| Tables | `SupplierLedger`, `ReturnRequest`, `OrderItemEvent`, `OrderDeliveryFeedback` |
| Enums | `OrderItemStatus`, `ReturnRequestStatus` |

These are concrete application dependencies: settlement writes SupplierLedger; delivery reads item state and disputes, writes history/feedback; refund review reads the item/dispute context. Ordinary Prisma selections may also request the missing User columns. The other 78 shape discrepancies remain inventoried separately; not being labelled critical by this diagnostic does **not** certify unused or harmless code paths.

See `release-baseline-evidence.json` for file checksums and exact critical findings. Comparison is bounded to presence, required nullability and enum presence; it is not a complete type/default/index/FK/enum-value drift diff.

The existing integration/browser fixtures deliberately construct the current core schema before applying recent migrations. Their passes remain valid for that schema, but cannot establish fresh-install or deployed-baseline readiness. Do not use fixture generation as a production migration or run `db push`, `migrate reset`, blind `migrate resolve`, destructive recreation or balance/ledger backfills to suppress this gap.

## Safe baseline and recovery sequence

1. Obtain an **authorized isolated staging schema** and migration-name/checksum/completion metadata. Start with `scripts/runtime-baseline-preflight.sql` and `scripts/release-preflight.sql`. They read only schema metadata; do not include application rows, migration logs, connection strings, credentials or potentially sensitive schema defaults in a shared report. No actual deployed/staging baseline was accessible or inspected in this task.
2. Compare the real staging baseline with both the migration-derived schema and current Prisma schema. Identify whether required objects were created by an earlier manual/schema-push process, and preserve the actual applied checksums. Do not rewrite historical migration files or mark missing work applied.
3. Design a separately reviewed forward reconciliation migration for confirmed structural differences. Missing ledgers and item states require evidence-based reconciliation of historical orders; do not fabricate escrow credits, releases, payment proof, delivery confirmations or refund quantities. An empty new installation and a populated existing database need distinct reviewed handling.
4. For the new quantity guard, first count `MoneyReviewCase` rows where kind is REFUND and quantity is NULL in that authorized staging environment. If any exist, stop. Resolve each from immutable order/request evidence via an approved corrective process; do not infer a quantity from price or delete cases. The additive constraint itself leaves invalid data unchanged on failure.
5. Rehearse on a disposable copy: synthetic or sanitized fixtures, baseline reconciliation, full additive chain, read-only preflights, then browser/API/financial invariants. Verify a backup restore before applying real staging changes. This task restored only synthetic fixture data.
6. On failure, stop the rollout, retain failed-migration metadata and audit evidence, and restore the disposable staging rehearsal as needed. Actual Prisma deploy may leave committed statements from a multi-statement failed file; the per-file transactional audit does not model that failure recovery. Do not blindly rerun or mark migrations resolved. Reverting app code does not justify dropping additive audit/payment tables.
7. Keep production activation separately gated. This report does not authorize live schema access, migration, merge, deployment, worker execution or money movement.

## Native runtime and operational gates

Installed versions are Prisma/client 6.19.2 on Linux x64, Node 24.19.0/OpenSSL 3.5.7. Installed native engine locations contain no native schema/query engine; accessible fixture caches contain the JS compiler/WASM runtime instead. The prior official binary-host HTTP 403 was **not retried**, and inaccessible caches/alternate routes were not used. No new authorized native runtime source emerged. Native deployment-client execution and `prisma migrate deploy` remain unrun.

The full optimized build/browser harness uses the established test-only JS/pg Prisma adapter and local font fixture. No external provider, SMS, Chatwoot or live database calls are allowed by that harness. This does not prove native deployment runtime, real provider acceptance or the actual deployed configuration.

Required operational prerequisites remain: isolated native-capable runner matching the intended deployment target; a reconciled staging baseline; verified provider sandbox contract/test instrument; configured and validated outbox/reconciliation worker execution. Without an approved outbox worker, queued notifications do not send. Previous historical credential exposure needs separate owner-led review/remediation; new-diff scans do not clear repository history. No credential rotation or settings changes occurred here.

## Smallest remaining decisions (proposals, not active policies)

- **Recommended proposal:** keep withdrawals/refunds review-only for the first staging release. Before financial execution, the owner must define eligibility/fees/limits, destination verification and reviewer/executor responsibility. No numerical thresholds or automatic expiry are proposed as established rules.
- Decide partial refund allocation across merchandise, shipping, tax and commission, plus returns/eligibility rules and treatment of already released/withdrawn funds. Require authoritative prior-paid/prior-refunded totals and unique external execution evidence before enabling approval/execution.
- Confirm delivery charging policy. Existing cart code charges TZS 3,000 per order, waived above TZS 150,000, with zero configured tax calculation. Confirm whether this is intended for multiple sellers/destinations/packages; this task does not reinterpret it or provide tax policy.
- Provide the authorized staging schema metadata and an existing isolated runner with the matching official native Prisma engines available. No production credentials or new paid service are needed for the next baseline/native test step.
- Obtain provider confirmation of the intended ZenoPay API version, reference/amount/status contract and safe sandbox/test identities, including phone-only payer acceptance. Mocked calls are not provider acceptance. Any actual sandbox calls or worker activation require a separate authorized setup.

## Validation record

- 391 unit/action tests across 37 suites passed, including storage-removal failures and explicit notification router refresh.
- 154 PostgreSQL tests passed with the backup fixture (153 without it), including NULL rejection and refusal to install the guard over an invalid pre-existing row.
- Synthetic backup/restore matched 14 critical tables plus schema/constraints. Latest recorded dump: 82,031 bytes; SHA256 `e6e67dd09744d8a837f5399595f1bb35aeadbc2ea3a73ba2e6ae9bcc0353624f`. No dump was retained or uploaded.
- Full optimized fixture build, typecheck, lint and all browser workflows passed. Browser assertions verify committed-response loss → reload → one withdrawal case/hold/audit event, plus an actual RSC refetch and UNKNOWN-filter removal after notification retry. Logs: `/tmp/prostore-readiness-unit-verified.log`, `/tmp/prostore-readiness-pg-verified.log`, `/tmp/prostore-readiness-types-final.log`, `/tmp/prostore-readiness-lint-final.log`, `/tmp/prostore-readiness-browser-verified.log`. The final stage was `/workspace/prostore-staging/prostore-browser-3o4QpH`; its disposable database/services were removed.
- Independent review found the retry/NULL defects and failed-storage-cleanup edge; all were corrected and the cleanup behavior re-reviewed. Reviewer inspected code, not test execution.
- SQL migration audit intentionally exits 2 for the verified baseline gaps; do not report this as a passing release gate.
