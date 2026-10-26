-- Read-only schema gates; only run on an independently authorized staging database.
-- This checks the deployed shape, not historical migration-chain correctness.
BEGIN TRANSACTION READ ONLY;
SELECT name, to_regclass('public.' || quote_ident(name)) IS NOT NULL AS table_present
FROM (VALUES ('Order'),('SupplierLedger'),('MarketThread'),('MarketProposal'),('OtpThrottle'),('PaymentAttempt'),('PaymentAttemptEvent'),('OrderNotification'),('OrderNotificationEvent')) required(name);
SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='orderSmsEnabled' AND data_type='boolean' AND is_nullable='NO') AS sms_preference_column_present;
SELECT 'notification_event_key_unique' AS requirement, EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='OrderNotification' AND indexdef LIKE 'CREATE UNIQUE INDEX%' AND indexdef LIKE '%("eventKey")%') AS present;
SELECT 'payment_provider_reference_unique' AS requirement, EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='PaymentAttempt' AND indexdef LIKE 'CREATE UNIQUE INDEX%' AND indexdef LIKE '%(provider, "providerReference")%') AS present;
ROLLBACK;
