# Marketplace delivery roadmap

New ideas enter this queue; they do not interrupt an active validated tranche.

| Order | Work                                                        | Status and dependency                                                                                                                                                                                       |
| ----- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Minimal storefront release                                  | Parent coordinates PR14 staging and release decision. Node22 native staging build reported READY; production promotion is separate.                                                                         |
| 2     | Seller registration, transactional notices and public shops | Implemented and isolated validation complete on feat/seller-registration-shops; release remains gated by full-stack staging and notice worker/provider verification.                                        |
| 3     | Full platform staging                                       | Requires schema baseline reconciliation on an authorized isolated copy, native runtime/migration validation, backup/restore and rollback rehearsal. Minimal storefront staging does not prove these checks. |
| 4     | Provider and workers                                        | Payment/SMS acceptance, approved outbox/reconciliation runner configuration, monitoring and operational ownership. No live sends or schedules enabled by source development.                                |
| 5     | Financial execution                                         | Withdrawals/refunds remain review workflows until business policies and independently verifiable settlement evidence are agreed and tested.                                                                 |

Existing draft branches remain recoverable. No source milestone by itself authorizes production migrations, credential changes or financial operations. Unknown bot integration stays deferred. WhatsApp registration notices require a verified integration and consent/template contract; SMS is the existing supported transport.

## Completed landing tranche

Seller registration is preserved in draft PR15 at f7a51ed7fb2a5c993eeaeffa0215371d52d10e32. The follow-on feat/landing-shopping-experience improves catalog hierarchy, buying guidance, truthful stock/price labels, canonical shop navigation, image fallback and accessible honest loading/recovery. All 450 unit/action and 173 historical-chain PostgreSQL tests passed, with full optimized fixture build and complete browser workflows. It also fixes a reproduced admin notification filtered-refresh race. See docs/landing-shopping-experience.md for measurements and limitations.

Next work is verified release/staging readiness in the dependency order above, not automatic promotion of this full-stack branch. The separate minimal storefront candidate remains parent-coordinated. No production migration, provider send, worker activation or financial execution was performed.

Current metadata-only staging inspection and diagnostic results: [release-readiness-current.md](release-readiness-current.md). Latest minimal candidate staging is canceled; shared environment scopes do not establish an isolated full-stack database.
