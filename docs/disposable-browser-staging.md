# Disposable browser staging and publication gate

## Publication inspection, 2026-10-26

Local checkout is Msosihub/prostore, branch `fix/zenopay-payment-reliability`. Remote main was read through the authorized GitHub connector and remains `52948fad457ceeb2eb67dfbdd9fd90812de06333`; the feature ref returned 404 (not published). Repository visibility is public. No repository Actions workflow configuration was found; GitHub reports zero Actions runs. This does not establish absence of deployment automation.

Both the baseline and the head of existing draft PR #1 have successful Vercel deployment statuses. Draft status does not suppress that integration. The baseline status links to https://vercel.com/erangs-projects/prostore/Dw2gE9BLEgtKJyXCe5oXcXEofKZu and the existing draft status links to https://vercel.com/erangs-projects/prostore/8tpKj97ex2WWfo28Z9DUVrAwkhUQ . These are prior deployment evidence, not deployments performed by this task.

Read-only Vercel project inspection for `prostore` in `erangs-projects` was denied HTTP 403 because the connection lacks team access. Production branch, preview credentials, build hooks and preview/database isolation could not be verified. GitHub CLI metadata also returned Forbidden; connector reads succeeded. Denied actions were not retried or bypassed. Push and draft PR creation were therefore not attempted: their required safety condition remains unverified. No production/security settings were changed. Existing tracked credential history remains an operational issue, and no raw history bundle is exported.

## Reproducible local workflow harness

Run `npm run test:workflows:browser` after the root dependencies and `tests/integration` adapter dependencies are installed. Playwright is isolated in `tests/browser/package.json` and its lockfile; install with `npm ci --prefix tests/browser --ignore-scripts` when not already supplied by the executor. Provide a Chromium executable at `/usr/bin/chromium` or through `PROSTORE_CHROMIUM`. The test also requires Docker at the local Unix socket, the postgres:16-alpine image, and the local DejaVuSans font fixture.

The harness:

- Creates one random-name disposable PostgreSQL container with tmpfs data and loopback-only random port. It never consumes an existing DATABASE_URL, live provider credentials or repository environment files.
- Copies tracked application source into a fresh temporary directory, omitting `.env*`, Git metadata and known credential files. It does not alter production application source. Prisma generation runs from that sanitized directory.
- Generates Prisma's supported JS client and injects the test-only pg adapter into the copy. Every application Prisma import is redirected consistently to that client, including JSON-null sentinels. Fixture tables are derived from commerce schema definitions, not historical migrations.
- Uses a sanitized child environment, synthetic OTP accounts, synthetic supplier/product/orders and dummy provider keys. A preload mocks ZenoPay status/collection and SMS; unknown fetches and non-loopback Node TCP connections are rejected. Browser HTTP routing rejects external hosts. This is test interception, not an OS network sandbox or provider acceptance test.
- Runs a full optimized `next build`, including checks/prerendering, with a local test font; then exercises the built app with `next start` and Chromium. It starts neither the live website nor a remote deployment.
- Stops its server process group and removes its own database in `finally`. Temporary logs and synthetic session state remain locally for diagnosis and are not recovery artifacts. Hard termination of the harness itself can require manual cleanup of its specifically named test container.

Workflow assertions cover real UI through server actions/API and PostgreSQL: OTP creation/login/one-time consumption; wholesale quantity/cart pricing; shipping form persistence and checkout; pending payment without stock/escrow mutation; repeated initiation returning PENDING with one collection; duplicate authenticated-status callbacks settling once; supplier OTP login/scoped order listing/dispatch; buyer delivery and persisted rating/comment with one escrow release; refresh without another release; accepted session update unable to elevate role; buyer supplier-page denial; anonymous/foreign payment denial; interrupted mocked collection response retaining its attempt, then reconciling without collecting again; dispute creation and blocked subsequent release.

The dispute scenario starts from an explicitly seeded order, then uses the real payment API, webhook and buyer UI. The first successful purchase runs from product UI through cart and shipping to settlement/delivery. The external status source and SMS are mocked in both scenarios.

## Build/runtime distinction

The full build and browser runtime here use the test-only JS/pg adapter and local font fixture. They are stronger than the earlier compile-only check, but do not prove native Prisma deployment runtime, real Google-font retrieval, historical migration compatibility, or provider sandbox acceptance.

Native engine investigation found no assets in accessible installed/cache locations. The official npm @prisma/engines@6.19.2 archive contains package code but no native binaries. Access to the root-owned Prisma cache was denied; no escalation or alternate-credential attempt was made. The previously denied binaries.prisma.sh endpoint was not bypassed or retried. Native runtime therefore remains blocked.

## Independent review

A separate read-only reviewer inspected the harness. Corrections included generation cwd isolation, accepted-response assertions for session updates and repeated initiations, explicit saved-feedback checks, and a last-mile socket guard covering HTTP get and URL/options overrides. An offline unit test verifies these blocked cases with the underlying connection method stubbed, so the guard test itself makes no outgoing request.

Initial exploratory failures were test setup issues: incomplete fixture tables, mismatched generated-client JSON-null identities, and waiting for network-idle despite background page traffic. They were corrected in the harness rather than changing product UI. Final results are recorded in the delivery report; no native/provider acceptance claim is implied.

## Completed validation

The packaged harness passed its full optimized build and all ten named workflow assertions against `next start` on 2026-10-26. Aggregate checks also passed: 141 unit/route tests across 16 suites, 33 real PostgreSQL tests, typecheck, lint with existing warnings and diff whitespace checks. A separate reviewer re-read every correction and found no further concrete defect. Its review was read-only, not an independent test execution. All test database containers and staging server processes were stopped; local synthetic diagnostics remain outside the repository.
