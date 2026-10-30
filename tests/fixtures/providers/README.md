# Provider contract fixtures

These are synthetic adaptations of documented response shapes, not captured sandbox/live responses. IDs, amounts, confirmation references and messages are fixtures. TZS and UUID/composite references reflect this application's stricter requirements, not proof that a provider accepts those inputs.

Sources reviewed 2026-10-26:
- ZenoPay-owned Python and PHP examples: https://github.com/ZenoPay/ZenoPay-Python and https://github.com/ZenoPay/zenopay-php . Match current code's zenoapi.com/api/payments base, x-api-key and status data/resultcode envelope. Status amount 1000 means 1000 TZS; no currency field is required by current ZenoPay parser.
- Pesapal API3 authentication: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/authentication . Sandbox base https://cybqa.pesapal.com/pesapalv3/api and production https://pay.pesapal.com/v3/api are separately configured; all tests mock fetch, including the production-host string test.
- Pesapal status: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/gettransactionstatus . Documented mixed-case Completed, status_code 1, merchant_reference, amount/currency, confirmation_code, status 200 and nullable error code.

Unverified: ZenoPay sandbox host/test-instrument contract, UUID=UUID acceptance, payments.invalid email acceptance, provider failure/null-field variants beyond existing unit coverage, real callback reachability, authentication/key validity, merchant enrollment and actual payment acceptance. No provider endpoint was called. Do not use the historical .net domain's contact details as freshly verified support information; current documentation availability/ownership could not be corroborated.
