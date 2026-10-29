# Landing shopping experience

The homepage remains a server-rendered catalog using current products, quantity-one prices, exact wholesale thresholds and approved public shops. It adds a clearer shopping guide, real category shortcuts, return-to-inbox/order navigation, buyer questions and the public seller application link. Featured means editorial selection, not popularity. No invented ratings, sales, scarcity, delivery deadlines or refund guarantees are shown.

The shared product card now labels the unit price, preserves exact bulk quantities and describes low inventory neutrally. Supported catalog image URLs retain the configured host restrictions; missing, invalid or failed images become a neutral placeholder rather than a broken icon. No new image service or dependency is introduced.

Root/catalog/product loading uses a branded skeleton instead of the full-screen animated GIF. Its status is announced politely, skeletons are decorative and animation respects reduced motion. After twelve seconds **mounted in the browser**, it offers reload/home recovery without inventing percentage progress or an ETA. Catalog errors offer retry, search, cart and order links. These controls cannot fix an unavailable backend; they make the state understandable. The GIF asset is retained to avoid deleting an unrelated asset, but these routes no longer request it.

SEO remains based on the existing canonical, sitemap, robots and truthful product schema contracts. Buyer questions do not add invented policy schema or review markup. The public seller shop link uses its canonical slug when supported. Homepage queries remain parallel and bounded; the seller projection replaces unused location with username.

## Verification

Final results are recorded in the commit handoff. Tests include static loading/image-source policy, real streamed delayed loading in a disposable-only QA route, reduced motion, slow recovery, keyboard FAQ expansion, broken image fallback, mobile overflow, empty catalog, canonical/product schema, sitemap and all existing shopping/payment/chat/seller/admin browser workflows. No QA route is added to the deployable application.

Performance is measured only in the isolated local fixture: it is not Lighthouse, real-user or native-hosting evidence. The former GIF is 310431 bytes; removing its request is a concrete resource reduction on loading routes. The client image fallback adds some JS, so this is not a claim that all page metrics improve. No production, provider, worker or schema gates are waived.

Depends on the full seller-registration stack, not the separate minimal storefront release candidate. No new schema, authentication or financial change is part of this tranche.

### Local measurements and completed checks (2026-10-29)

- 450 unit/action tests and 173 PostgreSQL tests passed. PostgreSQL used the actual 54-migration disposable chain; backup/restore compared 17 synthetic tables and constraints successfully.
- Type checking and lint passed (pre-existing warnings retained). The full optimized build passed with the established test-only JS Prisma adapter and font fixture.
- One final synthetic homepage navigation measured 125 ms TTFB, 275 ms DOMContentLoaded and 32716 transferred HTML bytes. These single-run localhost observations are not production performance guarantees. The optimized homepage reports 113 kB first-load JS versus the preceding seller build's 111 kB; image error handling accounts for added client behavior.
- Independent source review found no remaining concrete blocker. Desktop/mobile visual QA covered real fixture merchandise, keyboard questions, neutral missing-image state and reduced-motion loading. Long-wait recovery and streaming completion passed in the disposable-only delayed route.

The aggregate browser run also reproduced a pre-existing admin notification queue refresh race. A successful reviewed retry now reloads the current filtered document, so the UI rereads authoritative state instead of sometimes retaining the old RSC snapshot. The mutation, role checks and no-inline-send behavior are unchanged. Direct UI tests require reload only after success; the browser still requires a navigation GET, disappearance from the UNKNOWN filter and persisted QUEUED state.

The complete browser suite passed, including the repaired notification filter and final seller registration/review/shop/revocation scenarios. Final browser artifacts are executor-local at `/workspace/prostore-staging/prostore-browser-DoipNg/`; database and task server were stopped by the harness. These are static synthetic QA screenshots, not a user-accessible live preview. A final contrast-only adjustment darkens the neutral missing-image caption from slate-400 to slate-600; unit tests were rerun afterward, with no financial or query changes.
