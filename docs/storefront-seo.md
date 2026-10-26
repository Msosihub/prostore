# Storefront and catalog SEO

The home page now renders real catalog data on the server: a featured/latest product hero, category navigation, editorial featured products (existing `isFeatured`), recent products and seller discovery. Prices use the quantity-one tier where configured; bulk prices are explicitly quantity-qualified. Empty catalogs receive neutral states. This replaces banner/infinite-feed emphasis, not seller, buyer or admin capabilities.

Category pages render 24 products with ordinary previous/next links, stable ordering and separate page canonicals. Product URLs, sharing links and sitemap entries agree on `/product/[slug]`. Seller aliases point canonically to `/company/[id]/home`. Search filters are noindex/follow; unfiltered pagination has its own canonical. Private workspace/auth/checkout responses receive noindex headers while retaining Auth.js authorization. Local/explicit preview origins are excluded. Verify the real deployment origin and indexing headers before release.

Product JSON-LD uses actual product fields, quantity-one TZS pricing and valid Schema.org `InStock`/`OutOfStock` URLs. Script text is escaped. No invented reviews, ratings, shipping promises or return policy fields are added. Optional merchant shipping/return structured data requires an agreed, published policy first. Existing review UI remains database-backed. Google rich results/rankings and old Search Console notices have not been validated by this code change.

Sitemaps use a real XML index and bounded 10,000-record chunks for products, populated categories and sellers, with stable IDs and escaped URLs. No fake modification dates. The current Product model has no draft/publication lifecycle; eligibility is nonempty name/slug and positive price, not a newly invented publication status. Out-of-stock products retain their URLs and truthful availability. A future draft lifecycle requires explicit design and migration.

No payment, tax, shipping-price, stock or settlement policy changes. Native Prisma and real provider acceptance remain unverified. Full local builds use the documented test-only PostgreSQL adapter and font fixture; these do not establish production runtime readiness. See release-baseline-readiness.md for blocking schema drift, staging/rollback, workers and financial-policy gates.

Guidance consulted:
- https://nextjs.org/docs/app/guides/json-ld
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet

Validation evidence is recorded after final browser/review completion. Browser catalog images are repository sample assets attached only to disposable DEMO products, never seeded into a real catalog. Timing measurements are local synthetic observations, not Lighthouse scores or field Core Web Vitals.

## Release checks still required

- **Blocked schema baseline:** the isolated historical SQL replay succeeds, but it does not construct the complete current runtime schema. Reconcile the documented 15 critical missing objects against authorized sanitized staging schema/migration metadata, then test reviewed forward migrations and rollback/restore. Do not run this branch blindly against an existing database.
- **Native runtime:** build and exercise the actual deployment Prisma engine on an authorized compatible runner. The fixture adapter is not native-runtime proof; prior denied engine downloads were not retried.
- **Provider and jobs:** validate intended ZenoPay contract/test identities and SMS delivery in an approved sandbox. Approve/configure/test bounded reconciliation and notification workers; otherwise notifications queue without sending. No live provider acceptance has occurred.
- **Financial/business gates:** transfers and refund financial approval remain unavailable. Agree withdrawal/refund/return allocation, shipping/service terms and accurate privacy/contact information before publishing policy claims or enabling execution.
- **Operational/security gates:** owner-led historical-secret review, rate-limit/abuse behavior, monitoring/alerts, backup/restore and rollback rehearsal. Deferred unsigned bot and external legacy-chat limitations remain separate known risks.
- **Live SEO/infrastructure:** verify production origin, DNS/TLS, no accidental preview/noindex settings, real public URLs/404 behavior, robots/sitemap retrieval, image hosts, Google structured-data validation and Search Console after an authorized deployment. No live ranking/indexing results are asserted here.

Local evidence: 415 unit/action tests; 154 disposable PostgreSQL tests including backup/restore of 14 synthetic tables with matching schema/constraints; TypeScript and lint (existing warnings). Full optimized build uses a test-only adapter/font fixture. Build-reported home first-load JS decreased from 140 kB in the preceding fixture build to 111 kB (route payload 16.2 kB to 182 B). One synthetic local browser navigation observed 109 ms TTFB, 282 ms DOMContentLoaded and 26,881 transfer bytes; this is not a field-performance guarantee.

The complete disposable browser suite passed, including home desktop/mobile/empty visual checks, schema/canonical/sitemap/robots checks, server-rendered category pagination, search/history, login, cart/Buy Now parity, pending/interrupted/duplicate payments, seller dispatch/buyer delivery/disputes, scoped chat proposals, admin notifications and manual money review. All external commerce calls were mocked. Independent source review found a bulk-tier `N+` overclaim; it was corrected to an exact-quantity label and regression-tested. No remaining concrete review blocker was reported. Review did not independently rerun tests.
