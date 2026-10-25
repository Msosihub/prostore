# Payment, authorization and checkout reliability tranche

For subsequent fixes and real PostgreSQL/offline compile evidence, see [the adversarial review](payment-adversarial-review.md). The results below describe the original first commit.

## Scope and product map

- Target: `/workspace/prostore`, origin `https://github.com/Msosihub/prostore.git`, starting commit `52948fa`, branch `fix/zenopay-payment-reliability`. The initial working tree was clean.
- No AGENTS.md or local `.agents/skills` files were present in the selected workspace/repositories. README supplied the standard Next development/build instructions; there was no automated test script before this tranche.
- Product: Nimboya, a Tanzania-oriented wholesale marketplace. Next.js 15 App Router / React 18 serves buyer catalog, tier pricing, cart, checkout, order tracking, reviews, supplier onboarding/catalog/orders/wallets, admin moderation and dashboards. Tailwind/Radix supply UI components.
- Server: Next route handlers and server actions implement commerce, OTP/Google authentication through Auth.js JWT sessions, Prisma persistence, uploads, SMS, reviews and chat. Payment initiation and settlement belong to this repository, not the Nest backend.
- Data: PostgreSQL via Prisma, with decimal money, JSON cart/order payment metadata, per-product order items, supplier balances and unique ledger references. The schema and historical migrations also contain numerous Chatwoot-style tables. Existing migrations were inspected, not executed or altered. Runtime database destinations and whether both deployments use the same physical database were not verified.
- Payments: active checkout invokes the ZenoPay mobile-money endpoint; a separate Pesapal IPN verifies status but does not share the ZenoPay fulfillment path. PayPal helpers and legacy payment actions also exist. ZenoPay completion credits supplier escrow and sends buyer/supplier SMS; later delivery actions release escrow.
- Integration boundary: the read-only `/workspace/nimboya-nestjs-backend` checkout is a separate NestJS service. Its Chatwoot controller and Bull processor synchronize contacts, inquiries, conversations and messages using Prisma and HTTP. Prostore's Chatwoot components use `NEXT_PUBLIC_BACKEND_API_URL` (fallback `https://api.bmsounds.online`). Prostore also has an internal-key webhook receiver and process-local SSE stream. These are integration points, not proof that either deployment is running correctly. No Nest files were changed.
- Jobs/deployment: no scheduled payment reconciliation worker, CI workflow, container manifest or deployment configuration was found in tracked Prostore files. README describes Next/Vercel deployment; Nest has a Chatwoot queue. No production service was accessed or deployed.

## Verified defects addressed

1. **Critical: client-controlled privileges.** JWT update copied client `session.role` into the signed token; admin APIs trust session roles. Updates now refresh name/role/phone/onboarding from the database using the existing token subject. The session callback no longer reads an undefined `user` during an update.
2. **Critical: unverified settlement.** The webhook trusted supplied success, amount-independent order IDs and arbitrary callbacks. It now binds the exact stored attempt and queries ZenoPay with server credentials. Only verified completion, amount and reference reach fulfillment. Callback status/reference fields are ignored.
3. **High: unauthorized money/order actions.** Initiation now requires an authenticated owner and refuses to charge paid orders. Manual paid/delete/whole-order-delivery actions require a database-confirmed admin role. Standalone item confirmation requires a paid owned order. Buyer order reads are owner-scoped; all-orders listing is admin-only. This is not a claim that all repository actions are now secured.
4. **High: fabricated success and duplicate collection.** The provider wrapper discarded HTTP failures and fabricated a successful response. It now validates real response envelopes, rejects malformed/error responses and uses a bounded timeout. A database compare-and-set reserves the attempt before the network call. Concurrent clicks cannot issue two collection calls. Ambiguous failures retain the attempt; later requests reconcile it rather than charging again.
5. **High: partial/duplicate financial fulfillment.** The paid flag used to commit before inventory/escrow, making failures unrecoverable through callback replay. A single transaction now conditionally claims the unpaid exact attempt, decrements stock with an atomic availability predicate, and updates items/escrow/ledger. Rollback leaves the attempt retryable. Only the transaction winner sends notifications. An existing escrow entry with an unpaid header now fails for review rather than decrementing inventory again.
6. **High: caller-controlled cart amounts and supplier IDs.** Cart recalculation and checkout now use database price/tier/stock/supplier/product facts and persist matching line prices. Old carts are repriced at order creation. Invalid/zero/fractional quantities and insufficient stock are rejected; buy-now quantity is also validated.
7. **UX/privacy:** timers no longer imply completed payment; order status refreshes after a status check, and sanitized server recovery messages reach the buyer. Checkout submit buttons disable during submission. Removed payment payload/phone/raw-provider logs, raw error responses and the SMS helper's embedded fallback credential. No live credential was changed or revoked.

## Provider contract and recovery behavior

The v1 host stays `https://zenoapi.com`; this change does not silently migrate to another API host. Implementation follows the provider-owned [ZenoPay Python integration](https://github.com/ZenoPay/ZenoPay-Python): authenticated `GET /api/payments/order-status`, `resultcode: "000"`, `data[]`, exact `order_id`, `payment_status`, amount and reference. Amounts are implicitly TZS for this Tanzania endpoint; no undocumented currency field or HMAC contract is required. Unknown statuses/envelopes fail closed. Nothing in these checks constitutes a real-provider acceptance test.

- Initial successful collection returns PENDING, not paid.
- Repeating initiation for an existing attempt performs status reconciliation and sends no new collection request. Verified FAILED returns a support/review message; it deliberately does not rotate the reference automatically. A proper persisted multi-attempt model and explicit retry policy remain follow-up work.
- Provider timeout, unreadable response, rejection, status-not-found, or configuration failure never returns fabricated success. If a reference was reserved, it remains reserved even if the process failed before sending. Support reconciliation is required rather than risking a second charge.
- Callback failures return retryable HTTP 503 without sensitive details. Pending never becomes failed merely because a callback is not COMPLETED. Verified failure uses an unpaid exact-attempt predicate; completed state cannot be downgraded.
- A legacy result lacking the stored `zenopay_order_id`, or an older superseded attempt, requires manual reconciliation. No reference is guessed from a bare UUID and no old financial records are automatically repaired.
- Financial fulfillment is atomic; SMS delivery is best effort after commit. Duplicate callbacks do not re-send notifications, but a crash after commit or SMS outage can lose notifications. There is no durable notification outbox in this tranche.
- Payment can succeed externally while stock is unavailable locally. Settlement then rolls back and needs retry/support intervention; inventory reservation and refunds need a separate design.

## Validation and reproduction

Normal setup: `npm ci`, then `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Do not run `seed`, migrations or database reset against an existing database. Tests use mocked authentication, Prisma transactions, SMS and provider fetch; unexpected fetches fail. No payment or SMS was sent.

Executed here:

- Dependency install: `npm ci --ignore-scripts --cache /tmp/prostore-npm-cache --no-audit --no-fund` succeeded. The default npm cache was not writable; the workspace-safe cache resolved that issue. Lockfile was not changed.
- Standard `prisma generate`: blocked by HTTP 403 downloading engines/checksums from `binaries.prisma.sh`. An engine-free client was generated for local types only using `--no-engine` and local engine-path placeholders to bypass the download probe. This does **not** validate a runnable database client; regenerate normally before runtime/DB testing. No database connection was made.
- `npm test`: 62 passing tests across 8 suites. Covers provider errors/malformed JSON/timeouts, authorization, invalid input, concurrent and sequential initiation, retained ambiguous attempts, spoofed/stale callbacks, amount mismatch, pending/failed/completed transitions, transactional rollback/retry, duplicate fulfillment/SMS suppression, legacy escrow, client privilege escalation, and canonical cart/checkout pricing.
- `npm run typecheck`: passed after Next generated its ignored environment declarations.
- `npm run lint`: passed with existing repository warnings (hooks, unused disable comments, image usage); no lint errors.
- `npm run build`: failed fetching the existing Inter font from `fonts.googleapis.com`. No deployment was attempted. A production bundle/browser end-to-end flow was not validated.
- `git diff --check`: passed. The Nest checkout remained clean.

Mocks model transactional serialization/rollback; they are not a substitute for exercising PostgreSQL locking, JSON filters, rollback and stock contention in an isolated database. No live DB migration, integration test or provider sandbox transaction was run.

## Prioritized follow-ups

1. Isolated PostgreSQL integration tests for concurrency, compare-and-set JSON predicates, stock contention and rollback; provider sandbox contract fixtures; deployment-environment build and browser checkout verification.
2. Durable payment-attempt table, explicit safe retries, status-query throttling, periodic reconciliation and durable notification outbox. Review existing paid-but-unfulfilled/unknown/legacy records through a separately approved operational process.
3. Complete authorization review of supplier analytics, chat reads, order updates, exports and remaining server actions. Review already-issued JWTs and privilege-revocation behavior; this patch does not revoke sessions.
4. Unify or disable legacy Pesapal/PayPal/COD financial workflows after confirming intended usage; Pesapal and manual paid paths do not currently share atomic escrow fulfillment. Audit delivery/wallet release concurrency separately.
5. Credential incident review: an embedded SMS fallback credential was removed, but Git history is unchanged. Tracked `abc`/`abc.pub` also warrant owner review; their contents were not needed for this work. Inspect secret history and rotate/revoke through an authorized operational process. No secret value is reproduced here.
6. Broader OTP/webhook logging/authenticity, cart concurrent-update behavior, duplicate order creation, supplier reassignment between checkout and settlement, and buy-now tier/shipping parity require follow-up.
7. Confirm actual Ubuntu/Nest deployment topology, shared schema ownership and Chatwoot callback/SSE behavior before changing either service or migrations.

Commits are retained locally. No push, PR, merge, history rewrite, production change or deployment is included.
