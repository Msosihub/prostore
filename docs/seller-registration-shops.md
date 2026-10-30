# Seller applications and public shops

This tranche depends on the full runtime-reconciliation stack, not the standalone storefront release. No production migration or provider send has been performed.

## Customer and operator flows

- `/sell`: public, crawlable registration explanation with matching breadcrumbs. SMS sign-in verifies the phone before the essential business name, stable shop link, description and optional notice consent can be submitted. Existing buyers reuse their account. Registration makes a seller workspace available but does **not** approve a public shop.
- `/admin/seller-applications`: database-confirmed admin queue with status filters/pagination, document-review links, explicit decision/reason confirmation, version checks and immutable audit entries. Reasons are visible to the applicant. Approval criteria remain a human business decision.
- `/shops/[slug]`: server-rendered seller catalog with search/category/pagination, approved-profile badge, copyable shop link, canonical/OG metadata and visible BreadcrumbList. Products lead to existing product chat/cart/checkout. No private signup phone/email/address, fabricated reviews, delivery rates or sales claims.
- `/sell` also shows own application/notice status and opt-out. Existing profile/product editors update the shop's source data. Registered links remain stable; legacy username aliases resolve to their canonical shop or ID fallback. Unchanged legacy usernames remain editable without forced renaming.

New pending/rejected applications are excluded from public shop/catalog/search and new purchase quotes/chat starts. Owners retain private catalog management. Order creation and proposal acceptance lock seller rows in deterministic order and check eligibility before purchase creation, serialized with review. Existing orders/payments/fulfillment remain intact. Legacy suppliers retain their existing catalog visibility; unapproved legacy shops are noindex and have no approval badge. Next may return a streamed200 shell for notFound pages; the missing-page/noindex response must contain no shop data.

## Notices and release gate

Migration `20261027030000_seller_registration` is additive: SellerRegistration, SellerNotice, SellerNoticeEvent. It does not invent applications or consent for existing sellers. Apply only after the preceding full-stack migrations have been reconciled against authorized staging; do not apply the stack blindly to a populated database.

Receipt/review events are inserted in the same transaction as their business changes. Dedupe keys bind application, revision and event. Worker `sellerNoticeBatch()` in `lib/seller-notification-outbox.ts` defaults to **dry run**, batches at most50, uses90-second leases/fencing and at most5 attempts. Only an approved trusted runner may call `dryRun:false`. It resolves the recipient from the original verified account phone/digest and current consent, suppresses obsolete receipt/review events, and never stores message bodies or recipient numbers in the outbox.

No scheduler or inline delivery is enabled. **Deployment must not promise immediate SMS until this worker is configured, observed and provider-tested.** QUEUED means waiting, ACCEPTED means provider accepted (not delivered), UNKNOWN means ambiguous outcome requiring operator investigation. Expired sends and ambiguous responses are not automatically resent; there is no new arbitrary-send or manual-resend endpoint. Exactly-once external SMS is not guaranteed. Existing order outbox configuration does not automatically run this separate seller batch. WhatsApp is unavailable until an authorized integration/consent/template contract is verified; no bot/provider configuration changed.

Public text rejects common contact patterns and markup, and image URLs are restricted to intended upload/site hosts. This is not perfect contact detection or image/QR/OCR moderation. Product content and legacy integrations retain their documented limitations. Admin profile moderation and operational approval remain necessary.

## Validation

See final commit handoff for exact final check counts. Coverage includes anonymous/unverified/revoked roles, two-seller scope, duplicate application/review, rollback, conflicting reviews, private projections, canonical pricing restrictions, checkout-vs-rejection locking, consent/phone binding, stale notices, worker duplicates/crashes and profile compatibility. Historical-chain tests use disposable PostgreSQL and a test-only JS Prisma adapter, plus synthetic dump/restore of17 tables. Browser harness blocks external traffic and mocks OTP/payment transport. It does not prove native full-stack deployment or provider acceptance.

Mandatory gates remain: actual populated schema adoption, native full-stack staging/build/runtime, rollback/backup rehearsal, provider acceptance, approved worker/monitoring ownership and financial policies. No merge or production release follows automatically from a draft PR.

### Completed evidence (2026-10-29)

- 436 unit/action assertions passed after copying the exact-once route-decoding regression into this branch.
- 173 PostgreSQL tests passed on both generated fixture and the54-file historical chain; both independently dump/restored17 synthetic tables with matching schema and constraints.
- Isolated SQL replay:54 migrations passed,18 reconciliation guard cases passed, zero critical Prostore shape/type/enum drift in checked contracts;70 imported Chatwoot model gaps remain excluded.
- TypeScript passed against the generated test client. Lint passed with existing warnings and explicit image warnings; full optimized fixture build passed.
- Complete browser suite passed, including existing shopping/payment/chat/delivery/dispute/admin/money-review workflows and new application→approval→shop→profile update→revocation. Desktop/mobile screenshots were inspected; no horizontal overflow in tested shop view.
- Independent actual-diff review completed; concrete findings were corrected and relevant aggregate checks rerun.

Evidence logs are executor-local under `/tmp/prostore-seller-*`; final browser artifacts: `/workspace/prostore-staging/prostore-browser-dWeRv8/`. These are synthetic QA artifacts, not a public interactive preview. Full-stack tests still use the JS adapter/font fixture, not native Prisma deployment or provider acceptance.
