# First-party product chat and canonical checkout

Local branch: `feat/product-chat-checkout`, based on published PR4 head `9ec0573e91787f8466e6e0d5ef8eccc121be4b1d`. This tranche is not publicly pushed or deployed.

## Architecture discovered

Prostore already owns users, suppliers, products, ordinary orders, payment verification, inventory and seller escrow. Its legacy Conversation pairs a buyer User ID with a seller User ID; it has a unique buyer/seller pair and optional product context. Message, Inquiry and Quote support local history and Chatwoot identifiers, but the old quote template is chat text rather than an immutable accepted checkout contract.

The active product chat previously called the companion NestJS `/chatwoot/initialize`, which queues Chatwoot setup. Legacy message and quote UIs call NestJS `/chatwoot/message`; Prostore reads the local mirror via polling and has an internal event-notification receiver. This is a cross-service support integration, not a reliable first-party commerce acceptance boundary. Companion source was inspected read-only; no NestJS or Chatwoot configuration was changed.

## Implemented slice

- New buyer inbox `/buyer/messages`: one inbox with separate seller/product threads.
- New seller inbox `/supplier/marketplace-chat`: only the current database-confirmed seller's buyer threads.
- Product chat buttons and buyer/seller navigation open the first-party flow. Legacy Chatwoot pages remain available via an explicitly labeled link; no old history was rewritten or removed.
- New isolated MarketThread, MarketMessage and MarketProposal tables reuse existing buyer, Supplier profile, Product and Order records. Legacy Chatwoot mirror writes do not create first-party messages or proposals.
- Threads are unique per buyer/supplier/product. Supplier binding is derived from the canonical product; callers do not choose the merchant or sender identity. Admin role alone grants no participant access.
- Text-only messages persist before success is returned. Client UUIDs give server-side idempotency; changed content/sender/thread replay with the same UUID is rejected. Pending IDs survive reload via best-effort session storage; blocked storage never prevents sending. If storage is unavailable and the page reloads, an unacknowledged request's identity may be lost; server deduplication still requires the same ID.
- Active visible pages poll every five seconds. Inbox pages are 30 threads, message pages 50 records; stable cursors recover older history. Reconnect gaps reset the history cursor rather than silently merging holes. Only displayed incoming batches are acknowledged as seen. Labels say persisted, not delivered; no push/presence/realtime service is claimed.
- A seller prepares a quantity-only proposal for the thread's product. Pricing comes from the exact cart calculator, including wholesale tiers, current stock, canonical supplier, existing shipping threshold and zero tax. There is no negotiated-price authority or free-text proposal note.
- Proposal snapshots retain canonical line and total values. Buyer review validates the current quote and saved checkout address. A fingerprint detects address/detail changes; changed price/product/seller or insufficient stock requires a fresh proposal/review.
- Only that buyer can accept. Serializable transactions, bounded conflict retries, a proposal row lock and unique linked order make duplicate acceptance return the same ordinary unpaid order. Acceptance/cancellation races leave one consistent terminal state. The order stores its own immutable item/price/address snapshot; no inventory or escrow moves merely because a proposal was accepted.
- Buyer explicitly continues payment on the existing order page. Existing authorized provider initiation and verified settlement remain decisive; chat text never proves payment. Example: five units at 800 TZS plus 3,000 shipping produce a 7,000 payment and 4,000 seller escrow credit once. Sellers receive delivery contact via existing owned-paid-order views, not the chat proposal.

## Contact policy and privacy boundary

Server-side filtering applies to all new first-party message writes and canonical proposal labels. The existing Prostore-owned `/api/inquiries` route also applies the same validator to its six text fields before persistence. Numeric quantity/price fields remain structured. New chat display labels mask contact-like buyer/store/product names; private profile email, phone, password and account metadata are not selected for participant views. Buyer-only checkout review intentionally retains the buyer's delivery information.

The maintainable filter recognizes common phone separators, Unicode/full-width/Arabic digits, format characters, English/Swahili spelled digits, encoded/obfuscated email, URLs and common account-handle forms. Rejections ask for a rewrite without echoing or logging contact text. React renders ordinary messages as escaped text; no user HTML, attachment, image, QR or audio message input was added. Trusted proposal controls are separate from message content.

This is not perfect prevention: fragmented messages, novel encodings, languages, covert references and off-platform knowledge can evade deterministic text rules. Long free-text numbers can be ambiguous; quantities/prices and delivery addresses belong in their dedicated fields. No historical sanitization is claimed. Public platform support/delivery links on existing site surfaces are outside participant-message filtering.

Legacy direct NestJS/Chatwoot message and quote writes are outside Prostore's server-side enforcement. A Prostore UI check or notification receiver cannot enforce policy on writes already handled by that external service. The legacy link explicitly notes the policy boundary. Extending enforcement there needs explicit authorization to modify the companion NestJS chat write endpoints; no external account purchase is required. The separate deferred WhatsApp bot remains unchanged.

## Calls: planned, not implemented

Both inboxes show a disabled in-app calling control labeled as coming later. No phone/WhatsApp call link, microphone prompt, WebRTC session, service signup, credentials or real call was added.

A future implementation needs participant-authorized call sessions and short-lived signaling capabilities, explicit caller/recipient consent, privacy-aware relay/TURN transport, disconnect/reconnect handling, missed-call events, blocking/reporting and rate limits. Recording should be off by default. Infrastructure and operational authorization must be decided before activation. Voice permits spoken contact sharing and cannot be guaranteed safe by the text filter; any moderation tradeoff must be explicit.

## Migration and checks

`prisma/migrations/20261026150000_marketplace_chat/migration.sql` is additive. It leaves existing chat tables/history unchanged and defines restrictive foreign keys, thread uniqueness, message bounds, proposal status/order consistency and indexes. Prisma explicitly matches the restrictive optional Order relation. The actual SQL file, not only generated fixture tables, is executed by disposable PostgreSQL test setup. Tests verify accepted proposal/order links cannot be deleted into an inconsistent state. No existing/live database was migrated.

- 317 unit/action/component tests across 31 suites passed, including contact variants, allowed product discussion, direct inquiry-route bypass attempts and blocked-storage behavior.
- 74 disposable PostgreSQL tests passed, including anonymous/nonparticipant boundaries, buyerA/buyerB and sellerA/sellerB isolation, duplicate thread/send/proposal/accept, changed payload replay, history/unread paging, canonical totals, address changes, price/stock/seller/role changes and acceptance/cancellation races.
- Typecheck passed against the freshly generated test client using `/tmp/prostore-market-tsconfig.json`. Lint passed with existing unrelated warnings.
- Full optimized isolated build and browser workflows passed, including two sellers, contact rejection, lost-send-response/reload retry, storage failures, more than 50 unread messages, more than 30 inbox threads, proposal review/accept and separate mocked payment with one escrow credit. Evidence: `/tmp/prostore-market-browser-final.log`; disposable staging artifacts `/tmp/prostore-browser-zKYHv6` (database removed). Unit and PostgreSQL logs: `/tmp/prostore-market-unit-final.log` and `/tmp/prostore-market-postgres-final.log`.
- Mobile screenshots were visually inspected; the message history panel was bounded after QA so long histories do not push the composer indefinitely down the page.
- Independent read-only diff reviews identified pagination/read-state, contact-pattern, FK consistency and storage-recovery issues. All were fixed and re-reviewed; no blocking finding remained. Reviewer did not independently execute the application tests.

## Validation limits and release gates

The full build/browser tests use synthetic PostgreSQL, a test-only Prisma JS/pg adapter, local font fixtures and mocked external integrations. They do not establish native deployment Prisma runtime or provider acceptance. A no-engine native client-generation attempt unexpectedly fetched the previously blocked official checksum endpoint and failed HTTP403; no further native download attempt was made. Native `npm run typecheck` cannot validate new models against the stale installed client; the passing source typecheck uses the generated test client explicitly.

Before any release: validate official native dependencies in an authorized runner; apply/review the additive migration only in an approved isolated staging database first; validate provider sandbox behavior separately; and decide how to enforce policy on remaining legacy chat writes. Polling, moderation/abuse operations, rate limits and retention need operational sizing before large-scale traffic. No full historical migration-chain validation is claimed. Proposal UI shows the latest 20 proposals; this slice is one product per proposal, not a negotiated multi-product quote builder.

No public push, merge, deployment, live database/provider/SMS/call operations, credentials/security settings changes, Preview tracking changes, external NestJS edits or bot changes occurred in this tranche.
