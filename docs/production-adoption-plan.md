# Production adoption handoff — 2026-10-29

## Verified state and exact access gap

The approved isolated staging environment passed native Prisma deployment of all 54 migrations, 174 PostgreSQL regressions, full Next build and all 14 browser workflows at `e26a68ca0d69477340ece929bbf1244e24df7098`. Evidence is preserved on `chore/isolated-hosted-staging` in `docs/isolated-hosting-results.md`. That branch contains temporary target guards and a destructive **synthetic-only** rehearsal; never merge it into production or reuse its build command for production.

Production Vercel project remains `prostore`, Node22. A fresh production-deployment listing identifies READY `dpl_Dw2gE9BLEgtKJyXCe5oXcXEofKZu` at `52948fad457ceeb2eb67dfbdd9fd90812de06333`, listed as a rollback candidate; no promotion was performed. Metadata-only inspection (`decrypt:false`) shows a manually configured DATABASE_URL covering production/preview/development, no integration configuration association on that variable, and no separate database override. The team Neon integration lists no associated projects. The connected Neon account lists only the new Nimboya staging project and two unrelated BM Contractors projects. No production database connection is configured in the selected workspace. None of those unrelated databases was queried.

Therefore production database provider/project/endpoint identity and actual schema/history are **not verified**. An encrypted environment-variable record is not a usable database read connection. No decrypted production value was requested, no production SQL/dump was run, and no credential or access setting was changed. This is a missing identity/read-access prerequisite, not a denied SQL operation.

Smallest owner action: identify the production database provider/project/branch (identifiers only, no password), then use an existing authorized read-only connection to run the metadata export below, or connect the owning database account with read access. Do not paste DATABASE_URL. Creating a new role/credential or exporting customer records would be a separate action-time approval; neither is necessary to share this metadata.

## Metadata collection and offline assessment

Using an existing read-only PostgreSQL service/connection configured outside shell history:

```sh
psql -X -At --file scripts/export-production-baseline.sql > baseline.jsonl
node scripts/compare-production-baseline.cjs baseline.jsonl
```

The SQL uses a read-only repeatable-read transaction, 10-second statement/1-second lock/30-second idle timeouts, and rolls back. It exports database name/version, public table/column/type/index/constraint metadata, enum labels and migration names/checksums/completion timestamps only. It excludes application rows, defaults, expression definitions, comments, migration logs, roles and credentials. Keep the report private; review schema names/enum labels before sharing. Do not commit a production export to the public repository.

The comparator is offline. Exit2 means review required (missing/unfinished/unknown/checksum-mismatched/duplicate/non-prefix history or untracked existing schema); exit1 means invalid input. Exit0 means only that migration history is a known prefix. **No result approves migration execution or certifies schema equivalence.** Compare columns, exact constraints/index semantics, enums and the existing runtime/release preflights separately. Do not edit historical files, `db push`, reset, or blindly mark migrations applied.

## Adoption and recovery sequence

1. Confirm database identity against the production hosting owner, PostgreSQL version, actual deployed application SHA and migration metadata. Record checksums from the intended source revision. Determine whether any schema was applied manually.
2. Compare the actual baseline with the 54-migration chain and Prisma contracts. The runtime reconciliation migration deliberately refuses populated financial/delivery/message history and undeclared partial objects. A matching history prefix does not remove that guard. Missing historical balances/ledger/payment/delivery facts require authoritative evidence; do not infer or synthesize them.
3. Prepare a separate forward adoption migration only after the real differences are known. Preserve applied checksums. Document preconditions, lock duration, expected row counts and refusal behavior. No adoption SQL can safely be finalized from the empty synthetic baseline alone.
4. Before any populated-data rehearsal, obtain explicit approval for the copy/export destination and handling. Prefer schema-only metadata plus synthetic representative records; if sanitized production data is necessary, define minimization and deletion first. Never copy raw customer/payment/contact data into the current synthetic staging database implicitly.
5. Verify an owner-managed backup/snapshot, retention, restore capability and exact pre-change recovery point. Restore into a separate approved isolated database; check schema/history, row counts and financial invariants without publishing records. Existing disposable backup/restore tests prove tooling on synthetic data, not an actual production backup.
6. Rehearse the proposed adoption with the native runtime, including refusal/rollback, concurrent writers, interrupted migration and app compatibility. Run scoped financial/browser tests with mocked providers and all three worker dry-run health checks. Retain before/after metadata and audit results.
7. Release only after an approved production operation window, tested deployment target, compatible rollback build and observed worker/provider readiness. Capture the current production deployment/aliases immediately before promotion. Code rollback does not undo financial events or justify dropping additive tables. Prefer stopping affected writes and a reviewed forward correction; any point-in-time restore must account for post-backup writes and requires explicit operational approval.

## Provider acceptance and worker gates

Current source uses `https://zenoapi.com/api/...`, x-api-key authentication, TZS amounts, and authenticated status lookup as payment proof. Do not silently replace it with the separately documented v2 host. Obtain provider confirmation of the account's supported API version, non-chargeable test identities, callback authentication, required completed reference, status vocabulary, amount semantics and phone-only payer/email acceptance. No collection idempotency guarantee is assumed.

Prepare a provider-approved test matrix: initiation/pending/completed/failed; ambiguous timeout and status-first recovery; duplicate/out-of-order callbacks; wrong order/reference/amount; missing fields; stock-unavailable review; delayed/repeated status; reconciliation retry. Record sanitized provider evidence separately from local mocks. No real charge, SMS or refund is authorized by this plan.

For Africa's Talking, confirm the supported sandbox/recipient mechanism, sender identity and response contract. Test acceptance/rejection/ambiguous acknowledgement, consent and opt-out, delivery receipts if actually supported, and duplicate-risk handling. Provider acceptance is not recipient delivery. Unknown acknowledgement must remain reviewable; do not promise exactly-once external SMS without provider guarantees.

Only after those tests, name the operator and approve bounded execution for payment reconciliation, order notification outbox and seller notices: cadence/batch caps, leases, retry limits, UNKNOWN handling, backlog/oldest-age alerts, redacted logs, and stop/recovery procedure. No live runner or scheduler is configured by these scripts. Without workers, notices remain queued.

Keep withdrawals/refunds execution gated. Owner decisions remain allocation of merchandise/shipping/tax/commission refunds, already-released funds, eligibility, destination verification and reviewer/executor roles. Confirm existing delivery pricing (TZS3000/order, waived above TZS150000) and zero configured tax calculation rather than treating them as newly approved policy. Historical credential exposure still needs owner-led remediation with action-time confirmation for sensitive changes.

## Validation of this metadata tooling

Ten offline comparator/CLI regressions cover matching prefix/complete history without execution approval, missing/untracked history, drift, unknown/duplicate migrations, unfinished/gapped history, rolled-back retry and malformed/writable input. A network-disabled disposable PostgreSQL16 test verifies empty/present history, schema metadata, absence of synthetic row/default/log values, explicit write refusal and rollback. No live database was involved.

Independent read-only review found no blocking issue and reran the initial eight comparator tests; the two subsequent CLI-format/redaction cases also passed locally. The reviewer did not connect externally or rerun Docker.
