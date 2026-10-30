-- Read-only schema gates; only run on an independently authorized staging database.
-- This checks the deployed shape, not historical migration-chain correctness.
BEGIN TRANSACTION READ ONLY;
SELECT name, to_regclass('public.' || quote_ident(name)) IS NOT NULL AS table_present
FROM (VALUES ('Order'),('SupplierLedger'),('MarketThread'),('MarketProposal'),('OtpThrottle'),('PaymentAttempt'),('PaymentAttemptEvent'),('OrderNotification'),('OrderNotificationEvent'),('MoneyReviewCase'),('MoneyReviewEvent'),('SellerRegistration'),('SellerNotice'),('SellerNoticeEvent'),('UnmatchedPaymentNotice')) required(name);
SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='orderSmsEnabled' AND data_type='boolean' AND is_nullable='NO') AS sms_preference_column_present;
SELECT required.name, EXISTS(
 SELECT 1 FROM pg_index i JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace n ON n.oid=ix.relnamespace
 WHERE n.nspname='public' AND ix.relname=required.name
 AND i.indrelid=to_regclass('public.' || quote_ident(required.table_name))
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL
 AND i.indnkeyatts=cardinality(required.columns)
 AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY key(attnum,position)
           JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=key.attnum
           WHERE key.position<=i.indnkeyatts ORDER BY key.position)=required.columns
) AS unique_index_present
FROM (VALUES
 ('UnmatchedPaymentNotice_pkey','UnmatchedPaymentNotice',ARRAY['id']),
 ('OrderNotification_eventKey_key','OrderNotification',ARRAY['eventKey']),
 ('PaymentAttempt_provider_providerReference_key','PaymentAttempt',ARRAY['provider','providerReference']),
 ('SellerRegistration_supplierId_key','SellerRegistration',ARRAY['supplierId']),
 ('SellerNotice_eventKey_key','SellerNotice',ARRAY['eventKey'])
) required(name,table_name,columns);
SELECT 'refund_quantity_guard_validated' AS requirement, EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public."MoneyReviewCase"') AND conname='MoneyReviewCase_refund_quantity_required' AND convalidated) AS present;
ROLLBACK;
