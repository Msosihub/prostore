# Production release path — existing live providers

This is the current release decision record and supersedes older documents that require sandbox configuration or per-order reconciliation of owner-confirmed trial records. The owner confirms existing ZenoPay and Africa's Talking flows work. Preserve their configured live integration; optional SMS sandbox code remains unused. Owner operational confirmation is evidence, not a claim that the newly changed payment code was exercised against live providers.

## Read-only findings

- Vercel deployment-context API confirms Erang's projects is on Hobby, with Msosihub/prostore linked to project prostore. Project metadata reports Node22/Next.js.
- Production listing still reports READY deployment dpl_Dw2gE9BLEgtKJyXCe5oXcXEofKZu, main52948fad457ceeb2eb67dfbdd9fd90812de06333, a rollback candidate. New financial/worker releases are not deployed.
- Vercel's published Hobby plan restricts commercial use, and its cron limit is daily. A commercial marketplace needs an approved suitable hosting plan. No upgrade/purchase occurred. Sources: https://vercel.com/docs/plans/hobby and https://vercel.com/docs/cron-jobs/usage-and-pricing .
- The separate NestJS checkout contains Chatwoot/Bull integration, not an operationally verified runner for Prostore's new workers. No host, service health, scheduler or access evidence was found in its deployment documentation. It was inspected read-only and is not changed. An existing Ubuntu host is a possible runner only after its ownership/access/runtime are verified; source dependencies are not proof of an available service.

## ZenoPay guide comparison

Parent-reviewed integration guide states POST `https://zenoapi.com/api/payments/mobile_money_tanzania`, `x-api-key`, unique order_id, asynchronous initial success, GET `/api/payments/order-status?order_id=...`, COMPLETED for success, and completed webhooks with x-api-key verification. Current code uses those endpoints/authentication and binds a unique local attempt; it does not mark an order paid on initiation or trust callback text as payment proof.

The new status parser additionally validates resultcode000, exactly one matching order, amount and a nonempty completed reference. The supplied guide summary does not by itself prove every response field for this account. Preserve these safety checks; when authorized evidence is available, compare a redacted existing status shape without logging credentials or customer records. No charge is needed just to compare documentation.

Matched callbacks currently trigger authoritative status lookup; their incoming x-api-key is not a required rejection gate. Unmatched callbacks require that key before minimal durable capture. This is an explicit implementation difference, not a claim of full webhook-header enforcement. Do not silently change a reportedly working callback contract during cutover. No callback can directly credit a wallet from its claimed status.

Official owner-supplied references: https://github.com/ZenoPay and https://zeno.co.tz/ . Keep the working zenoapi.com API host; the marketing site is not an alternate API base. No live provider requests, messages or payments were made.

## Shortest safe sequence

1. Choose a suitable commercial hosting plan and runner. Keeping the existing Vercel project avoids a hosting migration, but changing the paid plan requires explicit owner billing approval. A verified existing Ubuntu runner can POST to the bounded endpoint; it does not remove Vercel's commercial-plan requirement. Do not quietly install jobs in the separate NestJS application.
2. Preserve the historical trial database and current deployment. Approve a clean production database target and its managed connection configuration, with backup retention and a restore point. Never reuse the credential exposed in chat. No requirement to reconcile individual trial orders; no deletion or blind reset. Existing synthetic rehearsal resources must not be promoted with destructive fixture rebuild scripts or demo accounts/passwords. Prepare the chosen target with the reviewed migration chain and minimal approved catalog/accounts; synthetic stock is not evidence of sellable inventory for real customers.
3. Assemble the full application source release (not the temporary hosted-test branch), run native build/runtime against the approved target and check migration/schema, login/roles, catalog, checkout and queue health without provider side effects. Verify build scripts cannot reset fixtures or migrate an unintended database. Keep refunds/transfers execution gated.
4. With specific action-time approval, configure the worker secret and individual modes, initially dry-run, preserving existing payment/SMS credentials and transport. Verify authenticated invocation, logging, budget and monitoring. Then explicitly activate bounded queues with approved scope. No new sandbox account is required. The authentication secret is never passed in command arguments or chat.
5. Record exact new database/deployment identifiers, backup, app-compatible rollback build, callbacks and cutover boundary before domain promotion. Preserve old trial callback evidence without replaying it into new orders. Rollback after new writes must retain the new database and queued work; pointing back to the trial database is unsafe.
6. Perform non-chargeable page/auth checks and observe callbacks/queue evidence. Any deliberate live payment/SMS check separately needs a named authorized recipient, amount (payment), count and scope. Do not invent or execute one under general development approval. Existing working-service confirmation avoids mandatory sandbox onboarding but cannot certify a changed release without deployment verification.

## Portable one-shot worker caller (implemented, not installed)

`node scripts/invoke-worker.cjs orders` prints a plan only; no network. Queues are payments/orders/sellers. The caller is fixed to `https://nimboya.com`, sends no body and refuses redirects. Only `--invoke` with the separately configured NIMBOYA_WORKER_SECRET sends a single authenticated POST. Server-owned queue mode controls dry-run versus execution; --invoke is NOT itself a dry-run. No automatic retry, looping, scheduler install, DB access or credential creation. HTTP failure/timeout is unconfirmed, not a reason to replay financial work. Successful output is only invocation evidence, never SMS delivery or payment settlement proof.

A host administrator can later wire the reviewed caller into an approved timer, with managed secret injection, non-overlap, alerts and a documented stop action. Cadence and capacity must match load: each call examines at most one candidate. Do not schedule it until target/modes and operating budget are approved. This prepares an existing-server option without claiming that server is accessible or configured.

## Validation of this handoff change

588 unit/action tests passed, including 12 caller tests for no-network defaults, fixed destination, authentication prerequisites, redacted failures, response limits and no retries. Typecheck and lint passed with existing warnings; the CLI planning command returned networkRequest:false. No database schema/runtime/UI changes, so database/browser/build suites were not rerun for this caller/documentation-only commit. Previous PR26 evidence remains separate:192 tests each on disposable PostgreSQL16/17 with adapter/restore validation, and offline compile. No production invocation or provider call was made.
