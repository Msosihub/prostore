# Seller catalog and OTP boundaries

Branch `fix/catalog-otp-boundaries`, based on `e28999a9606041e4f8b22a5664e8cd29e9054746` (admin PR6). Local implementation only; not pushed, merged or deployed.

## Confirmed defects and implemented behavior

The active supplier form and delete buttons called product server actions with no authentication/ownership checks. Product updates trusted `supplierId`, and product/tier replacement was not atomic. Desktop/mobile edit links mixed slugs and UUIDs. OTP generation used Math.random, resend counts disappeared with token consumption, failed guesses were not bounded across verification paths, and email OTP reported success without delivery.

### Catalog

- `lib/catalog-write.ts` checks the session identity and current database role inside each write transaction. Sellers must have their own profile; supplier binding is derived from that profile and mismatched caller input is rejected. A confirmed admin may explicitly target an existing active supplier. Updating an existing product cannot reassign its owner, including via admin targeting.
- Create/update validates finite positive monetary values with at most two decimals, database-compatible nonnegative whole stock, positive integer tier thresholds, unique thresholds, bounded tier count and matching category/subcategory. Existing schema validation still applies. Product creation explicitly initializes tags.
- Product/tier changes commit atomically. Product row locks serialize edits with stock deductions. Edit forms submit the loaded stock as `expectedStock`; stale stock requires reload instead of overwriting a checkout deduction. This is not full metadata revision control: unrelated concurrent metadata edits can still be last-writer-wins.
- Delete authenticates and scopes ownership, deletes tiers in the same transaction, and preserves referential protections for ordered/referenced products. Any constraint failure rolls the entire deletion back.
- Editor reads are supplier-scoped and support both existing slug and UUID links. Taxonomy helper writes require fresh admin authority and return generic errors.
- The shared supplier page guard and seller-owned profile/document APIs now reject a revoked database role. Document upload validates its file array before mapping it. The user-ID binding on those APIs remains server-owned.

### OTP and login

- `lib/otp.ts` is the shared issuance/consumption implementation for Auth.js and `/api/auth/verify-otp`. Codes use node:crypto.randomInt and remain six digits, five-minute expiry.
- Additive `OtpThrottle` table retains limits after code consumption/delivery failure. A transaction-scoped identifier lock serializes first issuance, resend, failed guesses and consumption across app instances. Time is sampled after lock acquisition.
- Security defaults: at most three sends per 15-minute window, at least 45 seconds between sends, at most five failed verification attempts per window. Resending does not reset failed guesses. Failed-attempt increments commit even when verification fails; a fifth failure invalidates the current code. Retry-After accompanies issuance throttling.
- Successful verification atomically consumes tokens and creates/verifies the phone account without changing its role. Duplicate verifiers cannot both succeed. Existing unexpired phone-token records retain compatibility and can be consumed once. Account lookup/creation failures roll back consumption for recovery.
- SMS failure returns a generic delivery error and invalidates only that issuance's token; an older failed request cannot erase a newer resend. Provider content, identifiers and codes are not echoed into errors/logs.
- Email OTP is explicitly unavailable rather than reporting fake delivery. Phone-only labels/input and recovery messages are updated. Google OAuth is unchanged. The separate verification API still verifies/consumes a code; the actual login UI uses Auth.js to establish its session.

## Migration and validation

`prisma/migrations/20261026180000_otp_throttle/migration.sql` creates only the new throttle table; no existing token/account rows are rewritten. The actual migration SQL runs in disposable PostgreSQL fixtures. No existing/live database was migrated. Deployments must apply this additive migration in approved staging before running the new login code.

- 344 unit/action tests across 33 suites passed. Existing logging/provider-boundary tests were adapted to the shared transactional service, preserving their redaction and delivery assertions; new input tests cover malformed/email and Tanzania phone normalization.
- 102 real disposable PostgreSQL tests passed. Added direct-action anonymous/buyer/revoked/two-seller boundaries, admin targeting/no reassignment, price/stock/tier rejection, concurrent stale-stock edits, successful create/delete, referenced-delete rollback, forced tier-insert failure rollback, and adjacent seller write rejection.
- OTP database coverage: simultaneous issuance, concurrent wrong guesses, shared lockout, duplicate consumption, expiry, persistent resend limits, window recovery, old-format token compatibility, failed SMS cleanup and delayed older-failure/newer-resend race. No real SMS sent.
- Source typecheck passed against the generated fixture Prisma client. Lint passed with existing unrelated warnings. Independent actual-diff review found no remaining concrete blocker; reviewer inspected tests but did not execute them.
- Full optimized isolated build and all browser workflows passed. Added UI-to-database checks cover supplier UUID/slug edits, stale-stock recovery, foreign editor isolation, disabled email OTP, resend limits and a lockout shared by the verification API and Auth.js. An initial build caught an unused import, corrected. A browser assertion expecting the old revoked-seller unavailable page was updated to assert the stronger unauthorized redirect. Another assertion was corrected to accept Auth.js null unauthenticated-session responses after the lockout behaved correctly.

Evidence logs: `/tmp/prostore-security-unit-final.log`, `/tmp/prostore-security-postgres-final.log`, `/tmp/prostore-security-lint-final.log`, `/tmp/prostore-security-types-final.log`, `/tmp/prostore-security-browser-final.log`.

## Limits and release gates

This is identifier-scoped OTP throttling, not a global/per-IP SMS abuse or denial-of-service control. Aggregate abuse monitoring, retention/cleanup of throttle rows and operational limits remain follow-up work. Existing VerificationToken storage format is retained, including plaintext short-lived codes in the database; no at-rest hashing migration is claimed. SMS provider acceptance remains separate from mocked transport and HTTP handling.

Expected-stock protection is not a stock-reservation system or full optimistic revision history. No payment, refund, payout, commission or seller-reassignment policy is added. Existing seller document certification synchronization and broader profile validation are not redesigned.

The established build/browser harness uses synthetic PostgreSQL, a test-only Prisma JS/pg adapter and local font fixtures with external requests blocked/mocked. Native deployment Prisma runtime and full historical migration-chain acceptance remain unverified; denied official downloads were not retried or bypassed. No changes to the Mac demo, production credentials/settings, external NestJS or deferred bot.
