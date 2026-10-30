# Candidate validation

This source integration adds deployment/archive exclusions, an offline SHA/migration manifest and redirect refusal for ZenoPay and Pesapal authentication/status requests. It does not change provider endpoints, account credentials, financial policy, database schema or production configuration.

- 601 unit/action tests passed, including package/hook checks and provider request-policy regression assertions.
- 192 disposable PostgreSQL17.11 regressions passed through the 55 historical/additive SQL migrations using the test-only Prisma adapter. Independent synthetic dump/restore matched 18 tables, records, schema and constraints.
- Typecheck and lint passed; existing lint warnings remain.
- Full optimized local fixture build and buyer login→cart/tier pricing→checkout/pending/recovery/duplicate mocked settlement browser flows passed. Fonts and provider transports are fixtures; this is not native provider acceptance. Disposable database removed.
- Independent targeted combined-source review found missing credential-artifact exclusions and payment redirect forwarding risk; both were corrected and regression checked. The deferred legacy messaging integration remains unresolved, not silently fixed.
- Archive listing with the new attributes contains no known root key files, .env files, test tree or hosted scripts. Final clean-commit manifest/archive checks are required for the chosen SHA. No raw history bundle is created.

The first local browser build failed with ENOSPC from retained disposable build caches. Only 15 generated .next caches under known disposable staging directories were removed; logs/screenshots were preserved. The complete build/browser rerun then passed. This was not a production or application-data operation.

Prior hosted-native evidence is SHA 9cfb426eff4da392706f01a080728f200bce8300, not this newly patched tree: Prisma/native PG16, full build and 17 browser workflows passed with mocked providers. Exact new candidate native deployment remains an operational gate. No live SMS/payment, production migration, secret configuration, worker activation, billing change, DNS change or deployment occurred in this tranche.
