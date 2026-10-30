# Synthetic marketplace staging refresh — 2026-10-30

## Verified deployed result

Existing isolated nimboya-staging is READY at deployment `dpl_D51rxjJKHReFkuxRHtRN5M5nnDGa`, commit `99a7bcee209aa86cfd94233b9e1504ff90c49ed0` on temporary branch `test/hosted-synthetic-relaunch`.

URL: https://nimboya-staging-1ab6z5udk-erangs-projects.vercel.app (Vercel authentication required).

No nimboya.com alias, production migration, credential change or real provider call was performed. The owner expressly approved replacement of this staging version and rebuilding its synthetic fixtures. All catalog/accounts/stock are generated test fixtures, not a verified exact transfer of the uploaded export. The original database is intact.

## Executed validation

- Native Prisma6.19.2 migration deploy/generation passed against the approved isolated PostgreSQL16 staging database, including the additive unmatched-payment-notice migration.
- All188 native PostgreSQL regression tests passed.
- Full optimized Next.js build passed.
- All17 native browser workflow scripts passed together: transfer approval, storefront/SEO/loading, credibility, discovery, login flow, cart, payment, delivery, dispute, legacy chat, multi-seller/admin, Buy Now, marketplace chat, catalog/OTP, seller shops, legacy review and unmatched notices.
- Browser tests ran against a loopback Next production server inside the hosted build with the real native Prisma client and remote synthetic database. External payments/SMS remained mocked. This is not provider acceptance or a public-browser authenticated checkout test.
- Separate authenticated deployed HTTP probes: homepage200 with DEMO label, synthetic-staging header and noindex/nofollow; /sell200; /robots.txt200 with Disallow:/; /admin redirected through sign-in without application authentication. Error/fatal runtime-log aggregation for this deployment returned no groups immediately after probes; this is a bounded observation, not a long-term monitoring guarantee.

Local prior evidence remains separate:539unit/action tests,188 PostgreSQL17 adapter integration tests,55-file SQL migration replay and18-table synthetic backup/restore, typecheck/lint, optimized fixture build and seven browser flows. The temporary hosted overlay also passed558 local unit tests/typecheck/lint before its native runs. The final selector/navigation changes passed syntax/diff checks, independent review, direct Playwright duplicate-markup reproduction, and a new local optimized build with transfer-approval,flow,cart,payment,delivery,multi-seller,catalog-otp. Earlier focused subset omitted its seller-session-producing prerequisite; the corrected full dependency sequence passed.

## Failures resolved during verification

Earlier hosted runs failed closed on test synchronization, not relaxed business rules: hidden streamed duplicates confused seller status, screenshot and labelled-input locators; an admin filter assertion could match an already-visible unfiltered order before navigation completed; a seller-review test assumed only one approved shop. Tests now select unique visible controls, target the intended seller, await submitted query navigation, and verify unrelated approval remains unchanged. All financial, authorization, privacy, persistence and deduplication assertions were retained. Independent reviews found no blocker. Earlier failed deployment URLs are not current previews.

## Release boundaries

The temporary hosted branch contains guarded synthetic reset/build instrumentation and a provider firewall. Never merge that overlay into production. Protected staging does not deliver real OTP/SMS or payments; successful build-time mock login is not a promise of public demo phone login. No bypass secret or test credential is published.

Original export materialization, category semantics and real opening inventory are no longer blockers for this explicitly synthetic demo. Before real commerce: confirm the intended fresh operational database/cutover and recovery target; verify providers through an approved nonchargeable route; configure/validate bounded reconciliation and notification workers; resolve exposed historical credential remediation through required approval; keep unconfigured money execution gated. Production PostgreSQL17 native acceptance and an actual production backup/cutover are not established by this PostgreSQL16 staging result or local adapter restore.
