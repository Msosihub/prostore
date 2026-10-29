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

## Next authorized product tranche

After the seller commit/publication, review and improve the landing page and its connected navigation/product cards/loading states. Aim for a clear, professional, mobile-first shopping path and truthful trust cues, with no invented stars, scarcity or delivery guarantees. Validate accessibility, SEO, performance evidence and discovery-to-checkout continuity. This is queued after seller completion and does not authorize infrastructure or financial activation.
