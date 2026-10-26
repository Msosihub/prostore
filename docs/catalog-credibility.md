# Catalog credibility closure

Branch: fix/storefront-usability. Follows 19e9a3c1636e862b867201b39c5001b72ef625ce; neither this follow-up nor that search tranche was published by this task.

## Actual findings and decisions

Both shared product-card variants displayed a fixed 4.5-star rating; the primary card also displayed a fixed review count of 12. StockBadge generated random sales counts and randomly showed scarcity notices. These were presentation inventions, unrelated to review/order records.

All actual primary-card consumers (search, category pages, product lists and supplier product sections) inherit removal of the unsupported review block. RelatedProducts uses the second card variant and inherits the same removal. No new props, queries or inferred sales counts were introduced. Cards omit review claims rather than implying that a missing feed field means zero reviews. Pricing, product links, supplier identity and images are unchanged.

StockBadge is now a pure component without client state, timers or randomness. It shows the actual inventory number only when that number is a positive safe integer of at most five. Unknown, non-finite, fractional, zero, negative and higher inventory values produce no badge. Out-of-stock rendering remains with existing parent components. No sales or popularity claim is derived from inventory.

Product detail already used Product.rating and Product.numReviews. The existing review action maintains these through review aggregate/count queries inside its write transaction. The new ReviewSummary keeps these stored values, displays a neutral zero-review message, handles missing/invalid summaries neutrally and provides one accessible label for the average/count. Decorative stars are hidden from assistive technology. This does not certify historical aggregate accuracy, concurrent review-write consistency, moderation or verified-purchase status.

## Changed files

- components/shared/product/product-card.tsx and product-card2.tsx: omit unsupported review blocks.
- components/shared/product/stock-badge.tsx: deterministic inventory-only notice.
- components/shared/product/review-summary.tsx and app/(root)/product/[slug]/page.tsx: database-backed detail summary with neutral states/accessibility.
- tests/catalog-credibility.test.js: component rendering for missing/invalid/zero/real values, repeated rendering and both card variants.
- tests/browser/credibility.cjs and scripts/test-workflows-browser.cjs: disposable PostgreSQL records, UI assertions and screenshots, then existing aggregate workflows.

## Executed validation

- 224 unit/action/component tests across 24 suites passed.
- 51 disposable PostgreSQL integration tests passed.
- Typecheck and lint passed, with existing warnings.
- Full optimized staging build and all browser workflow assertions passed. Credibility checks cover zero reviews; two synthetic review rows with ratings 3 and 4 projected through actual database aggregate/count queries to 3.5 and 2; accessible detail rendering; low inventory; no invented card review/sales text across three reloads; and no mobile horizontal overflow. Synthetic records/summary/stock are restored before checkout workflows.
- This fixture tests display of stored summaries, not the review-submission/moderation transaction. It does not invoke review-provider or SMS operations.
- Existing search, OTP, tier/cart, payment pending/completion/retry/duplicate/interrupted, supplier dispatch, delivery/dispute and chat tests also passed.
- Independent actual-diff review found no concrete regression. Reviewer did not execute tests. The React checklist was applied: remove unnecessary client state and expose an accessible summary without inventing data.
- Visual QA inspected mobile detail and catalog screenshots. Evidence is retained under /workspace/prostore-deliverables/catalog-credibility. Log: /tmp/prostore-credibility-browser.log; disposable stage: /tmp/prostore-browser-E6tuU2. Database removed.

Full build evidence still uses the explicit test-only JS Prisma adapter/local font fixture and synthetic data/mocked providers. Native deployment-runtime validation and provider acceptance remain unresolved. Existing no-JavaScript/client-router limits are unchanged; no new diagnosis or framework rewrite occurred. No schema migration, live data/provider action, credential/config change, NestJS modification, deferred WhatsApp webhook change, push or deployment occurred.

This closes the hardcoded card ratings/review counts and randomized sold-count issue recorded in storefront-usability.md. It is not a certification of every supplier/marketing claim or existing review-data integrity. This bounded follow-up is complete; work stops after its local commit.
