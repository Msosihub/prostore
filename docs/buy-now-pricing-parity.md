# Buy Now and cart pricing parity

Local follow-up on feat/multi-seller-fulfillment after a895ab342d33aebc952093925c7444d945f7e81b and d02c2ae48f758c623cc52cc62a47106ba174662d. No new pricing policy, schema changes, publication or live operations.

## Verified defect and fix

The active product quantity selector displays the highest applicable wholesale tier and passes its selected quantity and product slug to Buy Now. Cart checkout already reprices from the database. Buy Now's review page and createBuyNowOrder instead multiplied base price by quantity and set shipping to zero.

Both Buy Now review and creation now call a shared server-only quote helper, which resolves the existing slug URL parameter and delegates to the cart's canonical calculator. It validates integer quantity and stock, derives tier/base price and supplier ownership from the database, and uses existing shipping/tax semantics: 3,000 TZS shipping unless item total is strictly above 150,000 TZS; zero tax. No catalog claims or new fees were invented.

The action stores canonical supplier names, authenticated buyer identity and PREPARING status consistently with cart checkout. Buy Now preserves its existing Mobile fallback and does not mutate the cart. The review page rejects malformed/unavailable quantities with an error and no purchase controls; it no longer silently truncates fractional URL quantities. Anonymous users are sent to sign-in with their Buy Now callback retained. Non-Buy-Now visits to place-order2 go to the existing cart review flow.

## Verification

- 279 unit/action tests across 29 suites passed. New cases compare both checkout actions at quantities 4, 5, 9 and 10; shipping at exactly/above the existing threshold; invalid/fractional/unsafe/excess quantities; anonymous or missing identity; buyer/supplier/admin self ownership; forged identity/price/supplier fields; missing address; preserved Mobile default and untouched cart.
- 58 disposable PostgreSQL tests passed. The new case creates Buy Now at 5 x 800 TZS, retains stock while unpaid, then settles a bound synthetic gateway attempt twice concurrently: one stock reduction, one 4,000 TZS escrow credit and a scoped seller report excluding 3,000 shipping. The fixture explicitly binds the gateway attempt; browser tests exercise actual initiation.
- Typecheck and lint passed, with existing unrelated warnings. Independent read-only review found no concrete regression in implementation or final test corrections; reviewer did not execute tests.
- Browser comparison runs after the original cart workflow using the same product and quantity. It checks displayed 4,000 item / 3,000 shipping / 7,000 total, persisted order and seller snapshots, mocked provider amount, pending stock, duplicate callbacks, buyer view and seller report. Full optimized build and all disposable browser assertions passed in `/tmp/prostore-buynow-browser2.log`, with screenshots and build/server logs under `/tmp/prostore-browser-TLmJhg`. `buy-now-review-mobile.png` and `buy-now-seller-summary-mobile.png` were visually inspected. Unit log: `/tmp/prostore-buynow-unit2.log`; PostgreSQL: `/tmp/prostore-buynow-postgres2.log`; typecheck/lint: `/tmp/prostore-buynow-types2.log` and `/tmp/prostore-buynow-lint.log`.

An intermediate browser run stopped at a pre-existing catalog assertion because duplicate streamed markup matched a global selector. Exact review assertions are now scoped to main content. This was a test selector correction, not a pricing application failure.

## Limits

No price lock or checkout-order creation idempotency was added: both paths recalculate current database prices at submission, and product/stock can change after review. Settlement remains the stock/escrow authority. Tests use disposable synthetic PostgreSQL, the test-only Prisma JS/pg adapter, local font fixtures and mocked payment/SMS. They do not establish native deployment Prisma compatibility or provider sandbox acceptance. Prior engine access denial was not retried. Deferred WhatsApp and separate NestJS remain unchanged.
