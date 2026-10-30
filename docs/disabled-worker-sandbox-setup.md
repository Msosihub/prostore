# Disabled worker entrypoint and SMS sandbox preparation

Current direction: see [production release path](production-release-path.md). The owner confirms live providers work; sandbox setup is optional, not a mandatory launch prerequisite. Earlier validation limits remain factual.

This change installs no credentials, scheduler or provider resources and performs no deployment. Existing SMS behavior remains live with the existing account/sender when AT_SMS_MODE is absent. Do not configure this in production as part of sandbox acceptance.

## Trusted worker contract

`POST /api/internal/workers/payments`, `/orders` or `/sellers`, with no body or query string. No GET handler exists; there is no cron configuration. Browser login/admin roles do not grant access: a separate `Authorization: Bearer ...` credential is required. Missing/short credentials reject before worker work. Responses are non-cacheable and omit identifiers, recipients, amounts and provider payloads.

A separately approved `NIMBOYA_WORKER_SECRET` must be a random 32–256 character secret stored only in managed configuration. Never put it in URLs, repository files, chat, browser bundles or logs. Each queue also needs its own server-controlled mode:

- `NIMBOYA_PAYMENT_WORKER_MODE`
- `NIMBOYA_ORDER_WORKER_MODE`
- `NIMBOYA_SELLER_WORKER_MODE`

Missing/unknown modes are disabled. `dry-run` reads candidates without dispatch. Only exact `execute` runs the selected worker. Callers cannot change the mode or batch size. Each invocation handles at most one candidate; the declared Node function budget is 60 seconds and each provider request retains its 15-second timeout. This is a candidate-count bound, not a hard database wall-clock guarantee. Durable leases/fencing protect overlapping invocation and preserve ambiguous SMS outcomes for review.

`examined` counts returned worker results; it is NOT a delivered/successful-payment count. A zero count may include no due candidate or a lost concurrent claim. On HTTP503 inspect durable queue state before retry; side effects may already have occurred. A timeout is never authority to retry a collection. No retention or arbitrary SMS route is exposed.

Start with authenticated dry-run against isolated synthetic data. Verify the selected host, database, provider isolation and no recipients in logs. Before execution, approve the provider mode, runtime, operator, cadence, alerts and stop procedure. Removing the queue mode disables later invocations; in-flight work may finish. No schedule is installed. This POST-only route is not directly compatible with Vercel Cron's GET invocation: a future reviewed adapter or trusted POST runner is required. Existing deployment protection remains in place and must not be bypassed.

## Africa's Talking sandbox

Official sources checked:
- https://github.com/AfricasTalkingLtd/africastalking-node.js (sandbox username and optional registered sender)
- https://raw.githubusercontent.com/AfricasTalkingLtd/africastalking-node.js/develop/lib/common.js (fixed sandbox messaging host/path)
- https://help.africastalking.com/en/articles/1170660-how-do-i-get-started-on-the-africa-s-talking-sandbox (simulator rather than handset)

After specific staging configuration approval:
1. In the existing account, open Sandbox and prepare simulator identities/resources. Do not copy a public sample phone number as proof of an approved recipient.
2. Configure `AT_SMS_MODE=sandbox` and the sandbox app key as `AT_SANDBOX_API_KEY` only in isolated staging. There is no fallback to AT_API_KEY. The username is fixed to `sandbox`; the URL is fixed to `https://api.sandbox.africastalking.com/version1/messaging`. Redirects are refused to avoid forwarding credentials.
3. If the sandbox account requires a registered sender, configure `AT_SANDBOX_SENDER_ID`; otherwise it is omitted. The live sender is never inherited. Syntax validation does not establish sender registration.
4. Validate OTP and existing transactional messages using the simulator, including rejection/opt-out/ambiguous outcomes. Provider acceptance is not handset delivery. No real sends have been made by this implementation.

The current hosted synthetic demo intentionally blocks provider transport and uses mocks in its build-time browser tests. Do not merely add real sandbox credentials to that demo and call it accepted: a separately reviewed test transport deployment and callback access plan are required. Keep its current protection and production credentials unchanged.

## Remaining external evidence

ZenoPay guides mention test mode but the account-specific non-chargeable contract is unverified. Ask existing merchant support for the exact supported API host, test mode and approved identities, status/reference semantics and webhook procedure. Do not invent an endpoint or perform a charge. Old zenopay.net now displays an ownership-change notice; use established merchant account support. No payment sandbox or provider acceptance is claimed here.

Vercel team metadata did not expose the plan. Confirm the plan name only: official Cron documentation permits daily Hobby runs and minute-level Pro/Enterprise runs. No upgrade, new service, secret, callback-access change or live worker activation is authorized by this source patch.

## Validation

576 unit/action tests passed, including 28 new worker/SMS contract tests. Each disposable PostgreSQL 16.15 and 17.11 run passed 192 regressions, replayed historical/additive SQL and matched 18-table synthetic backup/restore data and schema. The route integration test verifies dry-run leaves queued rows untouched and execute sends one mocked SMS and records provider acceptance. Typecheck, lint (existing warnings) and offline compile passed. Independent diff review found no blocker.

The local database suites use the test-only Prisma adapter. Offline compile uses fixture fonts and does not prerender or prove native production runtime. No browser/full hosted build was rerun for this server-only change. No real SMS, payment, secret setup, scheduler or deployment occurred; provider sandbox acceptance remains unverified.
