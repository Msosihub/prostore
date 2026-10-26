# Release readiness: local-only follow-up

This follow-up is after published draft PR #2 at `b16542ea0696c3629ff95c89c7eaff183fe6a78d`. New diagnostics/tests are local-only; the specific public-publication approval covered the six already-published commits. No Vercel setting, credentials, database, provider account, deployment or PR head was changed.

## What can and cannot be established here

Already established: full optimized build/prerendering and production-mode browser workflows with synthetic PostgreSQL, test-only Prisma JS/pg adapter, local font fixture and mocked providers/SMS. That result is not a native-engine deployment test.

Native Prisma remains blocked by the earlier official binary-host HTTP 403 and absence of native binaries in accessible installed/cache locations and the inspected official npm package. The inaccessible root-owned cache and binary-host denial were not retried or bypassed. No new permitted source emerged. Repeating the same downloads or switching credential/routes would not add valid evidence.

Production configuration is not currently readable through the denied Vercel team scope. Parent-supplied evidence says Production tracks main and Preview Branch Tracking is off. Keep it off. No new read attempt or setting change was made. Static code compatibility and synthetic configurations can be tested; actual deployed values, target runtime/architecture, database TLS and provider enrollment cannot be certified from this workspace.

The package's build/postinstall workflow requires build-time development dependencies (Prisma CLI/client are currently listed there). Use the repository's normal install/build pipeline; an omit-dev installation before generation/build is not the validated path. No dependency versions or app runtime configuration were changed in this tranche.

## Offline configuration diagnostic

`scripts/check-release-config.cjs` accepts JSON on stdin only. It does not read process environment or .env files, make requests, connect to databases, or echo values. Input shape:

```json
{
  "previewTrackingEnabled": false,
  "environment": {
    "DATABASE_URL": "postgresql://synthetic:fixture@database.example.test/shop?sslmode=require",
    "NEXT_PUBLIC_SERVER_URL": "https://shop.example.test",
    "AUTH_SECRET": "synthetic-release-check-secret-not-live",
    "ZENOPAY_API_KEY": "fixture-only",
    "AT_API_KEY": "fixture-only"
  }
}
```

Run `node scripts/check-release-config.cjs < synthetic-config.json`. This example is synthetic and must never be installed into production. The tool checks required values, PostgreSQL URL shape, public HTTPS callback origin, accidental NEXT_PUBLIC credential naming, incomplete Google/Pesapal pairs and documented Pesapal API3 bases. It emits field/code/severity only, never user-supplied values. Zero exit status means no static errors, not release approval; runtime and provider warnings remain. `previewTrackingEnabled` is supplied evidence, not a live Vercel inspection. Do not paste live credentials into chat or commit a real configuration input.

## Read-only legacy diagnostic

`scripts/reconciliation-report.sql` contains a single SELECT/CTE report. It has no connection code, writes, payment calls or automated repair. We ran it only through a READ ONLY, REPEATABLE READ transaction against the disposable synthetic database, with a statement timeout. A regression test deliberately attempts an UPDATE in that transaction and verifies PostgreSQL rejects it without balance changes.

The report emits only code, scope and record ID. It flags paid orders without items/valid escrow credits, inconsistent payment/delivery states, unbound pending attempts, invalid item values, release mismatches, disputed releases, negative balances, and supplier histories that need human accounting review. It does not expose customer/contact/provider payloads or raw balance amounts.

These are review candidates, not findings of fraud or instructions to change money. Pending orders without an attempt can simply be uninitiated. Refunds, adjustments, payouts, imported balances and incomplete historic records cannot be inferred safely. The report explicitly flags unsupported ledger histories rather than calculating a repair. It does not prove completeness for orphaned/custom ledger references, stock history or unrecorded provider charges. Record IDs still require controlled handling.

Any future use against an existing database requires separate authorization and an approved snapshot/read replica or read-only role, using a bounded READ ONLY transaction and timeout. This task neither connects to nor exports an existing database. No diagnostic runner auto-consumes DATABASE_URL.

## Provider contract and sandbox requirements

Synthetic versioned response fixtures live in `tests/fixtures/providers`, with source provenance and deliberate transformations documented. They verify the current ZenoPay host/path, encoded order reference, TZS units, no required currency field, and Pesapal API3 token/status paths with mixed-case status descriptions. They are not captured sandbox responses.

ZenoPay provider-owned Python/PHP examples corroborate the current `https://zenoapi.com/api/payments` integration. A separate sandbox host, non-chargeable test phone/instrument and test-key behavior could not be verified. Composite `UUID=UUID` references and the phone-only `payments.invalid` email fallback remain unverified. Do not change hosts or initiate any collection merely to discover these contracts. Current documentation-domain availability/ownership was not sufficiently corroborated to recommend historical .net contact addresses.

Pesapal documents demo base `https://cybqa.pesapal.com/pesapalv3/api`, live base `https://pay.pesapal.com/v3/api`, separate demo consumer credentials and a bearer token valid up to five minutes. A publicly reachable registered IPN URL and notification ID are required before submitting an order. The current repository has active status/IPN support but no active Pesapal initiation flow; notification validation is not a complete Pesapal checkout acceptance test. Application constraints remain UUID merchant references and TZS only.

Sources: https://github.com/ZenoPay/ZenoPay-Python ; https://github.com/ZenoPay/zenopay-php ; https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/authentication ; https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus ; https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/registeripnurl . Documentation only was accessed; no token/status/payment/IPN-registration endpoint was called.

## Smallest remaining external actions

1. Provide an authorized isolated runner with the matching official Prisma 6.19.2 native engine for its OS/OpenSSL target already available or legitimately downloadable there. Run the original native client/build and synthetic database workflows with no live credentials. This cannot be replaced by the existing JS adapter evidence; do not bypass this environment's download denial.
2. Have an authorized deployment owner verify the intended runtime/build install path, actual configuration scopes and database isolation while Preview Branch Tracking stays off. The offline diagnostic can catch syntax/pairing mistakes in a controlled local session, but cannot attest credentials, scopes or reachability.
3. Obtain provider-confirmed non-chargeable sandbox instructions and test-only account/instrument/callback details through a verified provider channel. For ZenoPay, explicitly confirm host/version, composite references and phone-only email handling. For Pesapal, provide demo merchant/IPN setup only if that checkout path is intended to be activated. No real payment/SMS or credential setup is authorized by this task.

No merge or production deployment follows automatically from any of these checks. Existing credential history/operational remediation remains outside this tranche.

## Completed local validation

Final checks for this diagnostic tranche: 154 unit/route tests across 18 suites, 47 isolated PostgreSQL tests, typecheck, lint with existing warnings, and diff whitespace checks passed. The report ran against canonical records and synthetic legacy anomalies, including malformed JSON attempt types. PostgreSQL specifically rejected an attempted write inside the diagnostic read-only transaction. No test database container remained.

Independent read-only review identified the non-string JSON attempt false negative; the fix and expanded PostgreSQL cases were re-reviewed with no further concrete issue found. The reviewer did not execute the tests. Application runtime/UI code did not change, so the prior full staging build/browser evidence remains applicable but was not rerun for this diagnostics-only tranche. No native-engine test or provider API operation was run, and actual production configuration values were not inspected.
