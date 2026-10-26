# Storefront search usability tranche

Base: 675c6dd298f680261423dfe456157bb72f0c3693 (nine commits already preserved in draft PR2). Branch: fix/storefront-usability. This tranche is local only; no publication, deployment or live operations.

## Diagnosis and implemented behavior

Mobile inspection at 375px found that a completed empty-category search rendered eight permanent skeleton cards rather than an empty result. Search results now consistently show a localized empty message and an explicit show-all recovery link, including empty category/price/rating results and out-of-range pages. No catalog or brand redesign was performed.

The shared search input had no accessible label, its icon button lacked a name, and its rotating placeholder maintained timers and advertised supplier search despite the product-name query. It now has stable product-search wording, explicit accessible names and URL-synchronized text. Query whitespace is trimmed on the server for both metadata and results. Repeated URL keys consistently select the first value, matching URLSearchParams.get.

Pagination now wraps within narrow screens, exposes a named navigation region, identifies the current page and has readable ellipses. Sorting indicates the current selection. Page/rating/price inputs are validated before Prisma receives numeric filters or offsets; malformed values recover without a database validation error. Valid range/rating filters and the supplier-products limit of 10 are preserved.

Browser investigation reproduced stalled client-router search navigation when results included pagination. Requests returned HTTP 200 RSC data; the exact framework-level cause was not established. Search submission uses a normal GET form, and reset/sort/pagination use ordinary links. This is a deliberate progressive-navigation choice: it avoids depending on client-router completion and uses standard browser navigation, at the cost of full-page navigation for these controls. It is not a claim that the underlying Next router issue was fixed globally. A narrowly scoped lint exception documents this intentional use of native search links.

## Changed areas

- app/(root)/search/page.tsx: scalar parameters, empty state, sorting and native recovery links.
- components/shared/header/search.tsx: stable labeled input and native GET submission.
- components/shared/pagination4.tsx: wrapping, native page links and accessible/current state.
- lib/catalog-search.ts and lib/actions/product.actions.ts: safe query numeric normalization.
- tests/catalog-search.test.js: malformed and valid filters, repeated parameters and action query arguments.
- tests/browser/discovery.cjs: synthetic catalog, real reset/back/search/pagination clicks, invalid and repeated URLs, whitespace queries, mobile overflow, desktop/mobile screenshots.
- scripts/test-workflows-browser.cjs and tests/browser/delivery.cjs: run discovery with existing workflows and capture supplier screens.

## Verification and visual scope

The initial baseline full build/workflows passed and captured mobile search, empty category, product detail and cart. Screenshots confirmed the permanent-skeleton defect. The corrected native-navigation full build/workflows passed, including search recovery and all existing authentication, tier/cart, pending/completed/duplicate/interrupted payment, supplier dispatch, delivery/dispute and participant-chat scenarios. All external payment/SMS responses are mocked.

Unit/action suite: 208 tests across 23 suites passed. Disposable PostgreSQL suite: 51 tests passed. Typecheck and lint passed with existing warnings. Independent actual-diff reviews found repeated-key and whitespace edge cases; both were fixed. An exploratory JavaScript-disabled check timed out loading the app shell before submission; whole-app no-JavaScript support is not established and that exploratory case is not counted as passed. Final run status is recorded below.

Earlier client-router browser runs failed their navigation assertions and are not counted as passes. One intermediate build failed the intentional-native-link lint rule before its documented exception; a later run exhausted temporary disk space. Only disposable .next caches were removed, preserving screenshots and logs, before rerunning. The final required suite retains actual regular-browser GET/link interaction coverage; the unresolved no-JavaScript shell behavior is outside this bounded change.

Visual QA includes mobile empty results and pagination, desktop search, product/cart baseline, supplier order and product screens. Admin screens were inspected at source level only; no new authenticated admin browser scenario was run. No changes were made to those admin screens. These are full optimized build/next-start tests with the explicit test-only Prisma JS/pg adapter and local font fixture, not native Prisma deployment-runtime or provider sandbox acceptance.

## Remaining concrete limits

- Native engine/runtime, real provider acceptance, production configuration and historical data/migration gates remain as documented in release-readiness.md. No denied access was retried.
- The unsigned WhatsApp integration remains explicitly deferred and unchanged; the separate NestJS repository remains unchanged.
- Visual inspection revealed pre-existing catalog credibility issues: ProductCard hardcodes rating 4.5 and review count 12, and StockBadge randomly generates sold counts. These were not introduced by synthetic catalog data or changed in this search tranche; replacing them with verified data or omitting unsupported claims is a useful separate follow-up.
- Full-page search navigation trades SPA transitions for reliable progressive navigation. The underlying client-router stall remains unisolated outside this bounded path.
- Publication of this new branch requires applicable authorization; PR2 remains at the saved nine-commit head. No production approval is implied.

## Final outcome

Final optimized build and all required regular-browser assertions passed in /tmp/prostore-ui-browser10.log, using disposable stage /tmp/prostore-browser-Duzko6. The database was removed and no labeled test containers remained. The final run includes supplier-products smoke coverage and screenshots alongside the earlier workflow tests. No new code was published.

Synthetic-only screenshots and a copy of this report are retained under /workspace/prostore-deliverables/storefront-usability. Before/after empty-category images, mobile pagination, desktop search and supplier screenshots are included; no sessions, environment files or provider payloads are exported.

This bounded tranche is complete and work has stopped after the local commit. Remaining gates and follow-ups above are not represented as completed work.
