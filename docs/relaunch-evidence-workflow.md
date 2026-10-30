# Catalog relaunch evidence and unresolved callbacks

This is source readiness, not permission to cut over, import production data, create credentials or settle old orders. Keep both historical obligations and post-cutover orders recoverable. Continue the sequence in `catalog-only-launch-plan.md`.

## Callback contract and handling

The provider-owned PHP example (https://github.com/ZenoPay/zenopay-php, inspected 2026-10-30) documents the same `https://zenoapi.com/api/payments` host currently used by this application, status lookup with `x-api-key`, and incoming webhook `x-api-key` matching the configured API key. The official order-status documentation fetch returned 502; no newer API guarantee was inferred. No provider request was executed. This example does not establish this merchant's actual configured callback behavior or retry policy; provider acceptance remains required. No HMAC/signature contract or guaranteed redelivery is assumed.

Matched local attempts keep the existing authenticated provider status lookup and amount/reference checks. Unknown or mismatched local references are never interpreted as a new order or payment. A matching incoming key allows a minimal durable evidence record: reference, normalized **claimed/unverified** status, first/last observation and capped occurrence count. Payload bodies, customer fields, API keys and asserted amounts are not stored or logged. Concurrent duplicate hints deduplicate by a deterministic hash of provider/reference/status. Different status claims remain separate evidence; they are not state transitions. The endpoint bounds JSON input to 8 KiB and reference format to the application's safe reference alphabet. It supports opaque legacy reference strings, not just local order UUIDs.

An unmatched authenticated notification returns **503 even after successful retention**: it has not been processed or routed. Persistence failure also returns503; no successful acknowledgment is issued. An unauthenticated unmatched notification is rejected without a database write. Missing/wrong configured keys cannot authenticate evidence capture. Existing matched notifications still require authoritative provider status verification; this change does not impose an unverified new header requirement on that working flow.

`/admin/payments/unmatched` is a paginated, database-role-protected, read-only queue. It exposes no contacts or raw body and offers no replay, settlement, resolve or delete button. Match the reference privately against the retained old book and provider records. An unmatched reference is **not proof that it belongs to the old book**. Do not forward to a caller-supplied URL or create an order from it. Evidence retention has no automatic cleanup in this tranche. Monitor authenticated unexpected-reference volume and retain operator ownership of the queue. Credential compromise/rate limiting and retention policy need operational review; the API key check is not a claim of perfect abuse prevention.

### Remaining callback gate

Before cutover, an authorized operator and provider must verify which endpoint receives callbacks for already initiated attempts, the incoming header behavior, retry/timeout semantics, and how authenticated status lookup retains access to old references. Establish an authoritative reference-to-book inventory and approved dispatcher or separate callback endpoint. Rehearse late old callbacks, new callbacks, unknown references, storage failure and rollback. The new queue avoids silent evidence loss but is **not** this dispatcher and cannot settle or forward historical events. No successful delivery or eventual retry guarantee is claimed. Never migrate the endpoint blindly or abandon the old book.

## Offline catalog/account/stock verification

Run locally against approved private files (no database/network access):

```sh
node scripts/catalog-launch-review.cjs /private/manifest.json /private/review.json
```

Exit0 means supplied evidence matches sufficiently for **rehearsal only**; exit1 reports mismatch codes; exit2 means invalid/missing/oversized input. Each file is capped at16MiB. Output contains manifest digest, snapshot label/time, blocker codes and `productionExecutionEnabled:false`, never account or catalog rows. Keep the private inputs in the operator's controlled location; do not commit them. The strict schemas are in `lib/catalog-launch.ts` and `lib/catalog-launch-verification.ts`. The CLI uses the installed TypeScript loader and has no database client or credential lookup. Review labels must contain only letters, digits, `_` or `-`, not personal data.

Prepare review version1 with:

- `manifestDigest`: exact planner digest for the reviewed manifest. Any subsequent manifest edit invalidates it.
- `snapshotReference`, `capturedAt`, `catalogEditsFrozenForSnapshot:true`: the approved source snapshot boundary. A declaration is not an automatic production freeze; schedule it through an authorized operator. Re-export/review if catalog or stock changes before cutover.
- `sourceInventory`: independently exported UUID arrays for brands, categories, subcategories, products, tiers, variants and required suppliers. Exact sets are compared, including duplicates/omissions/extra records. Do not construct these arrays from the candidate manifest and call that independent completeness evidence.
- `accounts`: each source/target supplier UUID, target user UUID and public shop UUID, with reviewed ownership, actual SUPPLIER role, verified phone and approval. No phones, passwords, tokens, names or private documents. Target accounts must already exist through approved setup; the importer still checks current database verification/role/registration. Public shop URLs currently contain supplier UUIDs, so changing them is blocked until an explicit redirect/profile migration is implemented and verified. A boolean attestation alone is not identity proof.
- `stock`: one entry per product and variant with `kind`, UUID, `physicalSellable`, `legacyCommitted`, `withheld`, `disjointCountsReviewed:true` and `pendingReturnsExcluded:true`. Opening stock must equal physical sellable units minus disjoint legacy commitments and withheld units. Never count the same physical units twice across product/variant pools; confirm actual inventory semantics with the seller. Pending returns are excluded until separately received/reviewed. This is physical-stock reconciliation, not a rule to assign old payments or monetary balances.

The verifier detects inconsistencies in supplied evidence; it cannot establish that evidence is true, current or independently produced. Actual source export, seller account onboarding, identity continuity, public profile content and stock counting remain operator tasks. No production import path is added. Do not treat new-book zero balances as cancellation of old obligations.

## Migration and rollback

The additive `20261030090000_unmatched_payment_notice` migration creates only an evidence table and index. Apply only as part of an approved migration plan. Missing table causes unmatched authenticated callbacks to fail503 rather than acknowledge loss. Preflight checks table and deduplication primary key. Synthetic backup/restore includes evidence rows. A code rollback must retain this table/evidence and compatible callback capture, and must not redirect new orders into the historical book. No table deletion or production rollback SQL is provided.

## Executed validation (2026-10-30)

507 unit/action tests passed;185 PostgreSQL17.11 integration tests passed through the55 historical/additive SQL migrations. Synthetic18-table backup/restore matched rows, schema and constraints, including an unmatched notice. Typecheck and lint passed (existing image warnings). Optimized fixture build and four browser workflows passed: login/order flow, cart, mocked payment, and unmatched queue mobile/desktop/reload/revoked-admin. Mobile screenshot inspected. Independent review found a timestamp ordering issue, corrected with a monotonic update and regression. Initial redundant-key concurrency failure was corrected to a single deterministic hash primary key; final concurrent callback test persisted all observations.

Database/browser checks use the established JS/pg adapter and font/provider fixtures, not native Prisma17/provider acceptance. Disposable services were stopped and database removed. No production export, import, callback routing, credentials or financial records were accessed or changed.
