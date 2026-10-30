# Supplier/product-only restart after owner clarification

## Current decision

The owner confirmed all past transactions were trials, not actual customer data. Individual historical-order financial reconciliation is therefore **not a launch gate**. This supersedes the earlier conservative reconciliation requirement for these trial records. Preserve the old database recoverably; do not delete it, replay trial settlements, transfer trial balances, or use callbacks as proof of new orders. Unmatched callback retention remains necessary for stray trial notifications.

Carry forward suppliers, products and their catalog dependencies only. No buyer profiles/history, orders, ledger, payments, balances, returns, chat, reviews, ratings, sessions, password hashes, provider tokens or private supplier documents are transferred by these tools. Account access must be established through the existing verified login/onboarding process or an explicitly approved identity migration; the tool does not grant roles or manufacture phone verification.

## Executable preparation

1. In the owner's existing authenticated Neon SQL Editor, select the already confirmed source project and production branch, database `neondb`. Run `scripts/supplier-catalog-export.sql` and download its `supplier_catalog_snapshot` JSON. This is a repeatable-read, read-only transaction with timeout and rollback. It selects explicit public profile/catalog fields and supplier ownership UUIDs, not User contacts or credentials. No trial transaction rows are returned. The agent has not run it against that source: previous connector access failure remains unchanged. Do not share a database URL/password.
2. Keep the export private. Confirm counts, all intended suppliers/products, dependencies, media and source ownership. The export refuses excessive row counts rather than silently truncating; CLI inputs are capped at16MiB each. Its status must be `SOURCE_SNAPSHOT_NOT_REVIEWED`; an error is not a usable snapshot. If the actual source lacks a referenced table/column, report the SQL error without credentials—do not improvise writes or drop dependencies.
3. Get the digest offline: `node scripts/supplier-catalog-prepare.cjs /private/snapshot.json`. Create a private review JSON with version1, this `snapshotDigest`, `priorTransactionsAreTrials:true`, `preserveSourceDatabase:true`, `completenessReviewed:true`, plus `accounts` and `stock` arrays. Account entries contain `sourceUserId`, existing verified `targetUserId`, `ownershipReviewed:true`. Stock entries contain `kind` (`product` or `variant`), UUID `id`, explicit nonnegative integer `openingStock`, `stockReviewed:true`. Confirm actual stock; do not guess by reversing trial deductions. No per-trial-order reconciliation is required.
4. Prepare: `node scripts/supplier-catalog-prepare.cjs /private/snapshot.json /private/review.json /private/NEW-transfer.json`. The new file is created with mode0600; existing output is never overwritten. Only digests/counts print. Changed snapshots, duplicate mappings, absent reviews, unsafe public profile content/media, financial/private fields and changed supplier IDs are refused. Dates must have an explicit timezone, and the export emits UTC instants using the schema's UTC timestamp convention. New/changed source data requires a fresh review.
5. The execution entrypoint remains **disposable-only**: `rehearseSupplierCatalogTransfer` in `tests/integration/catalog-launch.cjs`. It rejects all normal application/database targets. It requires an empty supplier/catalog/transaction target, existing phone-verified SUPPLIER users with matching reviewed mappings, and takes table locks before checking/writing. Account rows are never changed. Supplier IDs, usernames and product IDs/slugs remain stable; catalog dependency trees are inserted in parent order. Any failure rolls back both profiles and products; duplicate/concurrent execution cannot overwrite or duplicate records.
6. Imported shops are PENDING and hidden. No verification badge/approval, SMS consent or performance metric is copied. Required legacy supplier email uses a reserved `.invalid` placeholder; actual verified login contact remains private on the independently established target user. Review through the existing admin seller-application page; approval is audited and notifications remain suppressed without explicit consent. Then test login, shop/catalog discovery, tier/cart/order, pending/verified mocked payment, delivery and supplier balances. Real provider acceptance is separate.

### Compatibility and scope limits

Safe legacy usernames containing ASCII letters, numbers, underscores or hyphens (up to100 characters) are preserved exactly. Those outside the current lowercase new-shop slug format keep the existing supplier-UUID URL fallback; they are not silently renamed. Unsupported usernames still require explicit review. Public copy containing contact details or unsupported media URLs also requires a reviewed correction. This prevents accidental private-contact publication; it does not sanitize the historical source. Media existence/rights and account ownership require actual evidence, not a checkbox. No live accounts, persistent credentials or new cloud resources were created. No production importer is enabled.

## Access inspected in this tranche

The existing authorized Neon staging database is accessible by supported metadata/read-only SQL. It is PostgreSQL16.15, has Product/SellerRegistration, and lacks UnmatchedPaymentNotice. It was not modified. Production target access was not retried and the credential pasted in chat was not retrieved, used, copied or transmitted. Local testing uses disposable PostgreSQL17.11; native Prisma17 acceptance remains distinct from adapter-based test passes.

## Smallest next step

Obtain the single allowlisted supplier/catalog snapshot above through the owner's existing SQL Editor or a newly authorized connector. No further trial-order queries are needed. After reviewing that real snapshot, establish verified target seller identity mappings and opening stock; approve the exact isolated target/runtime and provider nonchargeable acceptance route before live cutover. Preserve the historical source and any future new orders during rollback; never point a new operational book back at the trial database.

## Executed evidence

522 unit/action tests and188 PostgreSQL17.11 migrated-schema integration tests passed. The55-migration SQL chain and18-table synthetic backup/restore passed. Typecheck and lint passed (existing image warnings). Independent review findings on UTC export dates, a duplicated test category name and optional browser scenario ordering were fixed. No actual source catalog or identities were accessed.

The optimized fixture build and six selected browser workflows passed against the exported/reimported synthetic catalog: transfer approval, login/order flow, cart, mocked payment, delivery and multi-seller. This includes existing admin/reporting/manual-money-review scenarios. The shop was hidden before approval, retained its original public URL after approval and was visually inspected on mobile. Provider and font fixtures plus the JS/pg Prisma adapter were used; native runtime/provider acceptance is not inferred.

Reproduce only in the guarded disposable harness:

```sh
PROSTORE_TEST_PG_MAJOR=17 npm run test:payments:migrated
PROSTORE_TEST_PG_MAJOR=17 PROSTORE_BROWSER_SUPPLIER_TRANSFER=1 PROSTORE_BROWSER_SCENARIOS=transfer-approval,flow,cart,payment,delivery,multi-seller npm run test:workflows:browser
```

The first browser attempt exposed missing ProductVariant/Quote fixture tables, now included in that fixture only. A subsequent attempt correctly hit OTP resend protection when admin approval reused the buyer phone; the test now uses a separate synthetic admin, preserving the application rate limit. Final run passed and disposable services/database were removed.

## SQL Editor export format and category review

The preparation command accepts either the direct snapshot object or exactly one SQL Editor result row: `[{"supplier_catalog_snapshot":"<JSON snapshot text>"}]` (an object-valued cell is also accepted). Extra result columns, multiple rows, malformed JSON and incomplete snapshots are refused. All representations produce the same reviewed snapshot digest. A successful Library read is useful for private inspection but does not establish a byte-verified local materialization; do not claim an actual import from an unreadable local file.

If a product category disagrees with its subcategory's parent, preparation refuses it. Resolve through optional `categoryCorrections` in the review: an array of `{productId, categoryId, subcategoryId, reviewed:true}`. Each product may appear once, must exist in the exact digest-bound snapshot, and the resulting category/subcategory must satisfy the canonical hierarchy. Other fields, product IDs and slugs remain unchanged. This creates a reviewed target proposal only; it never mutates the source or invents a category. No corrections are applied automatically or marked reviewed by the tool; the optional draft command can propose structural corrections for review.

Envelope/compatibility follow-up validation:530 unit/action tests and188 PostgreSQL17 integration tests passed, including the wrapped export path and unchanged legacy shop-ID routing. Migrated SQL chain and synthetic backup/restore passed; typecheck/lint passed with existing warnings. No application UI or provider logic changed, so the prior full transferred-catalog browser evidence remains prior evidence rather than a newly rerun browser result. Malformed wrapper test parameterization found during independent review was fixed before final pass. No actual owner snapshot was copied into this repository or imported.

## Create a private review draft without inventing approvals

```sh
node scripts/supplier-catalog-prepare.cjs --draft /private/snapshot.json /private/NEW-review.json
```

The draft proposes using each selected subcategory's existing parent category when the product disagrees. This is a deterministic structural proposal, not proof that the selected subcategory is semantically correct. Missing/ambiguous identities or parent relationships refuse drafting. Consistent products are not changed. Source data is untouched.

Every category proposal starts `reviewed:false`. `targetUserId` and `openingStock` start null, ownership/stock/completeness approvals false. The actual preparation command refuses this unfinished draft. Do not copy source stock, reuse synthetic test accounts or match owners by similar business names. Establish verified target ownership and actual opening stock through the approved workflow. The draft file is mode0600, never overwrites an existing file, and console output includes counts/digest only.

Review-draft follow-up:539 unit/action tests, typecheck and lint passed; independent review found no blocker. This pure offline helper does not change importer/database/UI behavior. Prior188 PostgreSQL integration tests remain prior evidence, not a newly rerun database suite.
