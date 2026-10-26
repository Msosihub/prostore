# SMS route boundary closure

## Scope and caller evidence

Repository-wide searches found no active fetch/client/action caller of `/api/auth/send-sms`. It was a generic unauthenticated relay accepting arbitrary destination and text, returning provider responses and logging raw errors. It now always returns 410 without reading the request or importing the provider. This deliberately retires an unsupported relay rather than inventing a new administrator messaging workflow. Unknown external consumers, if any, must use a supported workflow; no external usage was inspected.

Public OTP uses `/api/auth/send-otp` and directly invokes the server helper with server-generated content. Order fulfillment, delivery and supplier processing, administrator supplier notifications and review feedback also invoke that helper directly. The helper is now explicitly server-only; network/provider failures become a fixed error without the original message, body or cause. Success response behavior is preserved for existing callers. No credentials, sender identity or provider URL changed.

OTP normalization still accepts local Tanzania numbers, 255-prefixed numbers and spaced international numbers. After normalization, the route accepts a single E.164-shaped phone or validated email; malformed identifiers and recipient lists return 400 before database or SMS work. Existing cooldown and server-generated message behavior remain. Email delivery is still the pre-existing TODO; this change does not claim email OTP delivery works. No new rate-limiting system or OTP lifecycle redesign is included.

## Validation

New direct tests prove the retired route cannot trigger the mocked helper, malformed/list identifiers cannot reach database/provider, normalized valid phones still receive only server-generated OTP content, and cooldown blocks sending. Helper tests cover successful requests, missing configuration and redaction of network/response errors. Existing OTP failure tests additionally check response redaction. The browser OTP scenario checks the retired route and recipient-list rejection before completing real UI login against the isolated synthetic database and mock SMS provider.

Executed results: 195 unit/action/route tests passed across 22 suites; 51 disposable PostgreSQL tests passed; typecheck and lint passed (existing warnings). The full optimized staging build and all browser assertions passed, including OTP login, retired relay/invalid recipient rejection, purchase/payment recovery, delivery/dispute and participant chat. The staging build uses the explicit test-only JS Prisma adapter and local font fixture; it is not native deployment-runtime evidence. Disposable databases were removed.

Independent actual-diff review found no concrete regression or new defect. The reviewer did not execute tests; the executor ran the checks above. No real SMS or other provider operation was used.

## Concrete remaining gates

- This closes the generic auth SMS route only. Caller inspection also found `app/api/webhook/route.ts` POST accepts incoming bot message JSON and calls SMS before any signature/authentication check, then invokes WhatsApp/AI/Frappe flows. GET verification is not POST authenticity. That distinct integration remains unchanged and must be reviewed before considering all public SMS triggers secure; actual deployment exposure was not inspected. Its intended integration owner must confirm the inbound authenticity contract before a compatible guard is designed. No endpoint was invoked.
- The separate NestJS `/chatwoot/message` source boundary remains outside Prostore modification authorization; see chat-participant-closure.md. Separate repository authorization is required to fix it; live exposure is not asserted.
- Native Prisma deployment/runtime validation needs an authorized isolated runner with the official matching 6.19.2 engine available. Existing download/access denials were not retried or bypassed. Full staging builds use the documented JS test adapter/local font fixture.
- Actual production configuration/scopes and database isolation require the authorized deployment owner; Preview Branch Tracking must remain off. No Vercel access retry or settings change occurred.
- Real provider acceptance requires verified non-chargeable sandbox instructions, test-only account/instrument and callback setup plus authorization for those operations. ZenoPay version/host, composite order reference and phone-only email fallback remain unverified. Mocked success is not provider acceptance. See release-readiness.md for exact provider requirements.
- Existing-data reconciliation has only a tested read-only report, never a live run. An approved isolated snapshot/read replica or read-only role plus explicit authorization is required for real legacy-data assessment. No automatic repair is provided.
- Public PR2 remains at b16542ea0696c3629ff95c89c7eaff183fe6a78d. Local readiness commit 10772e9dc01fc7f06f22d5f281e7d4dd66fa3d75, chat commit 2d55f81792b232bb4e1e560dbc3a64a80e10fece and this SMS closure are not published. Publishing these additional commits requires applicable public-publication approval and a fresh repository-side trigger check. Merge/deployment remain separate, unauthorized actions.
- Previously identified credential-bearing repository history remains an owner-managed operational issue; no raw-history bundle or credential remediation is performed here.

No additional access is needed to review these local changes. None of these gates is approval to deploy, change credentials, contact live providers or modify production data.
