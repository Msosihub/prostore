# Isolated hosting validation — 2026-10-29

This report supersedes the native-runtime gap in `release-readiness-current.md`; it does not clear production adoption or provider acceptance.

The approved temporary resources are Neon `red-art-74389446` / `br-holy-truth-b8luw8bi` (PostgreSQL16, synthetic database only), and Vercel `prj_MPVXg88eRPg4ggzn5pFl3NZbUHtM` (Node22, authentication on all deployments). New staging-only secrets were configured. No paid upgrade, live provider interaction, original project configuration change or nimboya.com promotion occurred.

Verified native deployment: `dpl_EyMjj2UhyCoPPb3Vwp1yMhubcEum`, commit `a44e91f9baa1b659bdc2f6d2a1f4a278830b458e`, READY. Real Prisma migration engine applied the 54-file migration chain; all 174 native PostgreSQL regressions and full optimized Next build passed. Protected serverless GETs for homepage, seller-registration and robots succeeded; the homepage carries the DEMO label and noindex header, and robots disallows crawling. This is native runtime evidence, not the earlier test-only JS adapter.

Local staging guard validation: 471 unit/action tests passed, typecheck passed, lint passed with existing warnings, independent review completed. Temporary rehearsal code is on `chore/isolated-hosted-staging`; never merge its target guards, provider firewall or test build override into production.

The first browser extension failed at an ESM package import, corrected and locally verified. The subsequent native browser run passed storefront/mobile/SEO/loading, real-data credibility, search/navigation, OTP login, canonical cart tiers, checkout/pending recovery, duplicate settlement and supplier dispatch. Buyer delivery confirmation then failed closed: escrow remained reserved, no release ledger or feedback was recorded. Remaining workflows were not run in that failed invocation. A diagnostic rerun captures only error type/code and fixed UI notices; no raw arguments or contact data.

Do not run overlapping rehearsals against this database: tests reset synthetic data. Deployed staging providers are denied by default; only the loopback browser rehearsal enables its in-process transport mocks. A protected staging URL is not a public customer site or evidence of real payment/SMS acceptance.

Still required before production: read-only assessment of the actual populated production schema/migration baseline; appropriate sanitized adoption/restore rehearsal; provider-approved non-chargeable payment/SMS tests; approved reconciliation/outbox/seller-notice operation; agreed financial/delivery policies with execution gates preserved; credential-history remediation and rollback verification. Do not apply the empty-database migration chain blindly to populated production.

Follow-up native browser run `dpl_DpMJ9x3QLCsEnbXG2WtkcaW314hW` at `aa237840841acd35188eda39cde0d9b98d665f8b` passed 12/14 workflow scripts, including the original delivery release/feedback/reload case and dispute hold protection. Packaged Chromium now uses multiprocess contexts; seller canonical checks distinguish compiled public origin from loopback transport. Only multi-seller and Buy Now scripts failed, on locators matching hidden streamed DOM copies. Commit `e26a68ca0d69477340ece929bbf1244e24df7098` scopes visible-content waits; financial/ownership/count assertions remain unchanged. Aggregate native browser success is still pending the rerun.

## Final aggregate result

Deployment `dpl_6kvnZDqzvRzZqGKr2CNAg6amxv5e` at `e26a68ca0d69477340ece929bbf1244e24df7098` reached **READY**. URL: https://nimboya-staging-6mr2ca2sh-erangs-projects.vercel.app (Vercel authentication required).

All **14 native browser workflow scripts passed in one run** after native migration/generation, all 174 PostgreSQL regressions and the full optimized Next build. Browser tests run against a loopback Next production server inside the hosted build, using the real generated native Prisma client and the new remote synthetic PostgreSQL database. They are not tests of public serverless browser traffic. Separate authenticated deployed HTTP probes verify the hosted serverless pages.

Covered: truthful storefront/mobile/SEO/loading and search; OTP login; cart/tier prices and Buy Now parity; initiation/pending/interrupted recovery and duplicate verified mock callbacks; supplier dispatch and buyer delivery with exactly-once escrow release; disputes; legacy and first-party chat tenancy, contact policy and proposal acceptance; multi-seller partial fulfillment and admin reporting; outbox manual retry/preferences; withdrawal holds/retry/cancellation and gated refund review; catalog authorization; seller registration/approval/notice dedupe/public-shop privacy. No real notices, payments, refunds or transfers occurred. Invariant diagnostics show expected rejection for deliberately disputed delivery, not an outstanding failure.

The earlier failure observations are retained above for traceability; they no longer represent the aggregate outcome. Fixes in this rehearsal concern browser packaging, context configuration, canonical transport origins and hidden streamed DOM selectors. No financial/application policy was relaxed to obtain a pass. Independent reviews confirmed unchanged privacy, database and financial assertions.
