# Adversarial review and isolated validation

The subsequent [shared settlement/release tranche](settlement-release-invariants.md) addresses the legacy financial-path follow-ups below and records newer validation totals.

Review base: `f518603dfd936d6349e681c1ea00f5b4bd45a521`, branch `fix/zenopay-payment-reliability`. This report supplements the first-tranche product map and supersedes its validation limitations where explicitly stated below.

## Compact review packet

Core implementations and changed files:

- `auth.ts` (first commit): client JWT refresh payload is ignored; identity comes from `token.sub`, and role/profile claims are reloaded from the database.
- `lib/auth-guard.ts`: shared server-only `requireAdmin` checks the authenticated user's current database role. `lib/actions/order.actions.ts` now uses this common guard instead of its local copy.
- `app/api/onboarding/route.ts`: role is validated against `z.enum(["BUYER", "SUPPLIER"])`; raw request logging is removed. `lib/actions/user.actions.ts`: global user listing/deletion/role editing require database-admin authorization; profile reads require self or admin and omit password hashes; self-service profile/address/payment-method writes reject missing identity before constructing Prisma queries.
- `app/supplier/users/page.tsx`, `app/supplier/users/[id]/page.tsx`, `app/supplier/layout.tsx`: the legacy global user-management pages now require admin and redirect unauthorized users. The misleading supplier staff-management navigation entry was removed. These pages queried all marketplace users and were not tenant-scoped staff management.
- `app/api/zenopay/create-payment/route.ts`: retains the one-attempt reservation and reconciliation design; missing email on a valid phone-only account now uses a per-buyer `@payments.invalid` address instead of blocking checkout or using an unrelated real inbox.
- `lib/zenopay.ts`: if an initiation result code is provided, it must be `000`; duplicate matching status records and whitespace-only completion references are rejected.
- `lib/order-fulfillment.ts`: rejects empty orders and missing/mismatched supplier snapshots; processes products in deterministic ID order; includes supplier ownership in the atomic stock predicate; notifications use the checkout supplier snapshot instead of a later product owner.
- `lib/actions/order-update.actions.ts`: shipping-address writes atomically require owner, unpaid and undelivered state; raw exception logging is removed.
- Tests: existing payment/provider/cart/fulfillment/authorization suites expanded, plus `tests/order-address.test.js`, `tests/user-authority.test.js`, `tests/integration/payments.integration.js`, fixture support and a separate integration-tooling package/lockfile.
- Validation tooling: `scripts/test-payments-postgres.cjs`, `jest.integration.config.js`, `scripts/validate-compile-offline.cjs`, npm scripts and one ignore rule. The root dependency lockfile and production dependencies are unchanged.

Exact authority checks:

```ts
// lib/auth-guard.ts
const session = await auth();
if (!session?.user?.id) throw new Error("Unauthorized");
const user = await prisma.user.findUnique({
  where: { id: session.user.id }, select: { role: true },
});
if (user?.role !== "ADMIN") throw new Error("Unauthorized");
```

```ts
// app/api/onboarding/route.ts
role: z.enum(["BUYER", "SUPPLIER"])

// lib/actions/order-update.actions.ts: updateMany predicate
where: {
  id: orderId,
  userId: session.user.id,
  isPaid: false,
  isDelivered: false,
}
```

Financial concurrency checks, preserved from the first tranche:

```ts
// Initiation: reserve before sending collection request.
where: {
  id: order.id, userId: session.user.id, isPaid: false,
  paymentResult: { equals: Prisma.AnyNull },
}

// Settlement: paid state, stock, item status, wallet and ledger share a transaction.
where: {
  id: orderId, isPaid: false, paymentMethod: "ZENOPAY",
  paymentResult: { path: ["zenopay_order_id"], equals: attempt },
}

// Stock decrement now binds supplier as well as availability.
where: {
  id: item.productId,
  supplierId: item.supplierId,
  stock: { gte: item.qty },
}
```

Webhook trust boundary: only the exact locally bound attempt can reach the authenticated status lookup. The callback's claimed status/reference are ignored. The lookup must yield exactly one matching record, a recognized status, a positive amount matching the order total, and a nonblank reference for completion. This is authenticated status verification, not a claim of cryptographic webhook-origin authentication.

## Findings and fixes from review

1. **Critical role-authority bypasses confirmed and fixed:** onboarding accepted ADMIN, and exported `updateUser` wrote roles without authentication. A user could therefore change the database role and bypass the first-tranche JWT protection. Admin user mutations/global reads now use the shared database guard. Valid BUYER/SUPPLIER onboarding and legitimate admin role editing are regression-tested.
2. **High identity-filter omission confirmed and fixed:** anonymous self-service user writes could pass `id: undefined` to `findFirst`, selecting an unrelated first user. They now stop before querying. Arbitrary user-profile reads are scoped, and password hashes are omitted.
3. **High order ownership bypass confirmed and fixed:** the shipping-address action only checked that some session existed. Its single UPDATE now filters authenticated owner and unpaid/undelivered state, avoiding a read/write ownership race.
4. **First-tranche compatibility regression confirmed and fixed:** phone-only OTP registration explicitly stores `email: null`; the new initiation validation incorrectly required email. Such buyers now retain checkout through a non-deliverable placeholder. Real-provider acceptance of reserved-domain addresses remains a sandbox acceptance item; no message is sent to a third-party fallback inbox.
5. **Supplier reassignment/empty fulfillment hazards fixed:** moving a product between suppliers could credit and notify a different supplier from the checkout record. Missing or mismatched snapshots now fail for reconciliation; the stock update includes the same supplier predicate. Empty orders cannot be marked fulfilled. Legacy items without supplier snapshots may now require manual review; no financial history was rewritten.
6. **Provider response ambiguity hardened:** contradictory result codes, duplicate matching status rows and blank completion references fail closed.
7. **Tier boundary review:** below/at each tier and downward quantity transitions use database tier prices and persist matching item totals. Tests cover quantities 4, 5, 9 and 10 across two unsorted tiers, plus invalid/zero/fractional/over-stock quantities. Buy-now tier/shipping parity is still a separate issue, not silently changed here.

## Real PostgreSQL evidence

`npm run test:payments:postgres` passed **12 tests** against a new PostgreSQL 16 container. Tests execute actual application fulfillment/reconciliation and initiation-route code with real SQL transactions. Auth, provider status/collection and SMS are mocked.

Passed scenarios:

- Eight concurrent completion calls have one winner: one stock decrement, one wallet credit, one ledger row and one buyer/supplier notification pair.
- Two different orders competing for insufficient stock cannot oversell; the loser retains unpaid state.
- Stock failure rolls back and succeeds after restock.
- Both database NULL and JSON null permit one concurrent initiation reservation.
- Stale attempts cannot settle.
- Concurrent FAILED/COMPLETED verification cannot downgrade completion.
- A database constraint failure at ledger insertion rolls back stock, wallet, paid flag and item state; retry succeeds after removing the test constraint.
- Amount mismatch leaves financial state untouched.
- Legacy escrow blocks another stock decrement.
- Native `json` storage and default `READ COMMITTED` isolation are asserted.
- Eight concurrent requests through the real initiation route result in exactly one mocked collection call.

Isolation and reproducibility:

```sh
npm ci --ignore-scripts
npm ci --prefix tests/integration --ignore-scripts
npm run test:payments:postgres
```

The launcher uses only the local Docker Unix socket. It creates a uniquely named, labeled container, a tmpfs data directory and a random localhost-only port. It constructs and overrides the database URL itself and never consumes an existing DATABASE_URL. The fixture refuses non-local/non-test connection strings. Only its own container is stopped/removed in `finally`; no test containers remained after validation. No host data directories are mounted, and no historical migration or seed script is run.

Because native Prisma engine downloads remain blocked, the launcher generates a separate test client from a copy of the repository schema with Prisma's supported `engineType = "client"` and the PostgreSQL driver adapter. Production schema/client configuration is not changed. Adapter dependencies and their lockfile live under `tests/integration`, avoiding production transitive dependency updates. The test schema contains the commerce models' scalar types, native JSON/UUID/decimal columns, enum values, primary/unique keys and relevant foreign keys. It does not validate all historical migrations, unrelated Chatwoot models, or every deletion/cascade behavior. The tests validate PostgreSQL concurrency and actual query predicates, not the deployment's native Rust engine binary.

Reference: [Prisma v6 Rust-free client configuration](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/no-rust-engine).

## Final validation

- Clean root dependency installation against the unchanged root lockfile: passed, with lifecycle scripts disabled for controlled generation.
- `npm test`: **89 passing tests, 10 suites**.
- `npm run test:payments:postgres`: **12 passing integration tests**.
- `npm run typecheck`: passed.
- `npm run lint`: passed with existing warnings.
- `git diff --check`: passed.
- `npm run build:validate:offline`: passed with Next's compile-only mode and a temporary local font fixture. The script strips inherited credentials, points database configuration to a non-service localhost endpoint, and refuses repository `.env` files. Temporary fixture files are removed. It does not change the Inter import/branding or the normal build command.
- Normal production `npm run build` remains blocked by the Google Fonts fetch observed in the first tranche. Native Prisma engine downloads remain blocked by HTTP 403. Those paths were not claimed as fixed.
- Browser behavior, production prerendering, native-engine deployment execution, provider sandbox acceptance and real SMS delivery remain untested.

## Remaining bypasses and operational limits

- Existing sessions/database roles that may already have been compromised are not revoked or repaired by code changes. Operational review is required separately.
- Legacy Pesapal/manual paid paths still do not share ZenoPay's atomic fulfillment; delivery/wallet-release concurrency, supplier analytics and chat authorization need dedicated follow-up.
- Pending/failed/unknown attempts still do not automatically launch another collection. No periodic reconciliation worker, durable attempt history, refund workflow, stock reservation or notification outbox is introduced.
- SMS remains best effort after financial commit. Lost notifications are possible even though duplicate callbacks no longer resend them.
- Provider status lookups still need throttling. Callback-origin authentication/header compatibility needs sandbox confirmation; authenticated lookup is the decisive trust boundary.
- Older paid-but-unfulfilled records, missing attempt references and missing/mismatched supplier snapshots require deliberate reconciliation. This code does not guess or repair them automatically.
- The old supplier user-management UI was global administration, not scoped staff management; that broader product feature must be designed separately.
- No remote publication, deployment, live migration, real payment/SMS call, live credential change, merge or history rewrite occurred. The separate Nest checkout remains untouched.
