# Multi-seller fulfillment

Local branch: feat/multi-seller-fulfillment, based on storefront head 00af92f51f2054193b878ddd4a6c1bdbe67d09b1 (draft PR3, stacked on PR2). This tranche is not published.

## Behavior

Buyer orders retain individual seller lines and a saved delivery address. Checkout snapshots canonical supplier names. Seller detail queries require a database-confirmed supplier role, a paid order and owned items, returning only those items and allowlisted delivery contact fields. Mutable buyer profiles, payment phone/results and other sellers' items are excluded. Admin order list/detail uses database-confirmed admin authority and shows payment, partial receipt, manual dispatch, dispute/feedback and escrow/wallet-release states separately. Tracking is seller-entered information, not a carrier integration.

Dispatch locks the paid parent order, checks ownership and dispute state, and creates one transition/event. Repeated dispatch preserves the first timestamp/note and does not resend SMS. SMS failure after commit reports a warning without undoing dispatch. Only a normalized single recipient from the delivery snapshot can be sent to the mocked/provider helper. Manual reminder remains a separate explicit action; no durable outbox is claimed.

## Verification

- 244 Jest tests, 27 suites passed, including direct authorization, malicious recipient, checkout snapshot, idempotent dispatch and unfunded escrow display cases.
- 56 isolated PostgreSQL tests passed: concurrent duplicate dispatch; cross-seller scoped reads; dispatch/dispute and dispatch/receipt races; simultaneous final two items from different sellers; canonical ledger and balance checks.
- Full optimized Next build and all disposable browser workflow assertions passed. Browser covers OTP, tier cart, pending/interrupted/duplicate payment, buyer/seller delivery/dispute/chat, catalog/search and new multi-seller workflow across buyer, two suppliers and admin.
- Typecheck passed. Lint passed with existing unrelated warnings. Independent read-only final diff review found no remaining concrete regression after phone-recipient and feedback fixes. Reviewer did not execute tests.
- Mobile screenshots visually inspected: /tmp/prostore-browser-axAyzY/multi-seller-{supplier,buyer,admin}-mobile.png. Browser log: /tmp/prostore-multi-browser5.log; unit: /tmp/prostore-multi-unit7.log; PostgreSQL: /tmp/prostore-multi-postgres2.log.

An earlier browser test incorrectly matched a callback query before login finished; corrected to exact pathname and verified session identity. Earlier streaming not-found expectation was corrected to assert unavailable content rather than HTTP404. Final run passed.

## Limits

Build/browser use a disposable synthetic PostgreSQL schema, test-only Prisma JS/pg adapter, local font fixture and mocked network integrations. This is a full optimized test build, not validation of native deployment Prisma engines or provider acceptance. Native engine access and provider sandbox acceptance remain unresolved. No production/live database, migrations, external SMS/payments, deployment or credentials/settings changes. No schema migration required. Deferred WhatsApp integration and separate NestJS unchanged.
