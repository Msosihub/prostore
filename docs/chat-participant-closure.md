# Participant-scoped chat closure

Scope: Prostore only, following local readiness commit `10772e9dc01fc7f06f22d5f281e7d4dd66fa3d75`. No NestJS changes, provider calls, credential/settings changes, public push, merge or deployment.

## Verified boundaries and fixes

`getConversation` was an exported server action accepting an arbitrary conversation ID and returning full buyer/User and supplier/User/Supplier objects. No current UI imported this action, but the exported action still required authorization. It now requires a session identity and a UUID, then queries by ID AND buyer/supplier participation. No existing admin chat workflow was found, so an ADMIN role alone grants no exception. Unrelated and nonexistent conversations both return null.

Shared server-only projections now serve this action, the polling API and buyer/supplier server pages. They preserve current UI fields, including buyer email displayed in SupplierChatLog, product/inquiry context, sender IDs and the Chatwoot conversation ID used by the existing integration. Passwords, addresses, supplier balances, unused provider metadata and moderation notes are not returned. Detail replies and linked inquiries are separately constrained to the selected conversation so malformed legacy cross-thread links do not disclose another thread. The buyer page redirects missing identities to the actual sign-in route; both server pages require a nonempty user ID before querying.

`mark-seen` already constrained mutations to a participant, but omitted conversationId could broaden the update to every participant thread. It now validates a strict UUID body and confirms participation; the update retains the same participation predicate and only marks incoming messages. Foreign threads return 404, malformed/missing IDs 400, and absent identity 401.

The active `/api/inquiries` route previously accepted any authenticated user's supplied conversation/product plus unrestricted spread payload. It now permits only the conversation's buyer, verifies the product belongs to that conversation's supplier user, binds buyerId from the session, and accepts only explicit inquiry fields. Nested writes, status/author overrides and foreign products are rejected. The numeric fields match Decimal(12,2): quantity at least .01, price nonnegative, maximum 9999999999.99, at most two decimal places. Supplier participants can read inquiries but cannot impersonate the buyer creating one. The only in-repo POST UI example is commented out; no current active caller required broader write authority.

The SSE route now requires session.user.id. The internal event receiver rejects absent or empty configured INTERNAL_SHARED_SECRET, closing the empty-header/empty-config case. A valid configured internal key preserves the existing relay. No secret was changed and no event was sent to a real integration.

## Validation and review

Direct action/route tests cover missing/malformed identity, unrelated buyer/supplier/admin, both participants, minimal selections, cross-thread nested filters, missing/malformed IDs, foreign writes, author/status/nested-write injection, product ownership, Decimal precision/range, and fail-closed internal relay configuration.

Real PostgreSQL tests verify actual filtered results rather than mocked authorization alone: private user/moderation markers and linked foreign messages/inquiries are absent, both participants can read, unrelated users cannot, mark-seen leaves foreign/outgoing messages unchanged, buyer-owned inquiries persist correctly, and invalid decimal values cannot round to zero or overflow.

The disposable browser harness now includes real buyer/supplier chat pages, polling payload checks, supplier mark-seen UI, buyer-owned inquiry API, foreign/anonymous denial and invalid-precision rejection. It runs alongside all existing purchase/payment/delivery/dispute scenarios against a full optimized build and next start. External browser HTTP is blocked and no send-message/quote control is exercised, so no NestJS or chat provider request occurs. Fixture data and credentials are synthetic.

Independent read-only review found the decimal precision/range issue; it was fixed and tested before final re-review. The React checklist was applied to the server-page changes: authenticate before query and minimize client serialization, with no new client hooks/layout behavior. Test-adapter/local-font limitations remain: these results do not validate native Prisma deployment runtime or real provider acceptance.

## Remaining source-supported risks, outside this closure

- The separate read-only NestJS checkout's `src/chatwoot/chatwoot.controller.ts` `/chatwoot/message` handler creates messages using caller-supplied conversationId/senderId and forwards caller-supplied Chatwoot conversation ID. No controller guard or global guard registration was found in inspected source. Prostore's active chat components call that backend directly. Deployment-edge protections were not inspected, so actual live exposure is not asserted; this is a concrete source-level boundary requiring separately authorized backend work. This Prostore closure does not secure that endpoint or authenticate upstream Chatwoot webhooks.
- Prostore `app/api/auth/send-sms/route.ts` accepts caller-supplied destination/message without an authentication check in that route. It was not invoked or modified in this chat task; provider usage authorization should be addressed separately.
- Chat lists still fetch complete message histories on a three-second polling loop, and the existing optional SSE relay uses process-local global emitter state. Pagination/scaling and durable realtime delivery are not implemented by this authorization tranche.
- Native-engine validation and verified non-chargeable payment-provider sandbox requirements remain blocked as described in release-readiness.md. No denied operation was retried or bypassed.

No new user access is needed to review these local fixes. Changing the separate backend requires repository authorization beyond the current Prostore-only modification scope; operational verification still requires its authorized owner. No production action is implied.

## Final executed results

- Aggregate unit/action/route suite: 178 tests passed across 20 suites.
- Disposable PostgreSQL suite: 51 tests passed.
- TypeScript check passed; lint passed with existing warnings.
- Full optimized staging build and all browser workflow assertions passed, including purchase, interrupted/duplicate payments, delivery/dispute and chat authorization. This uses the explicit test-only Prisma adapter and local font fixture, not the native deployment runtime.
- Independent actual-diff re-review found no further concrete defects after the decimal fix. The reviewer did not execute the suites; the executor ran the final browser rerun afterward.
- Disposable database removed; no labeled test containers remain. No live provider, SMS, chat backend or production operations were performed.
- This closure and the preceding readiness diagnostics remain local; the public draft PR remains at b16542ea0696c3629ff95c89c7eaff183fe6a78d.
