-- READ ONLY. Operator use only against separately authorized isolated staging.
-- Does not read user rows, credentials, migration logs or financial values.
BEGIN TRANSACTION READ ONLY;
SELECT required.name AS required_table,
       to_regclass('public.' || quote_ident(required.name)) IS NOT NULL AS present
FROM (VALUES ('SupplierLedger'),('ReturnRequest'),('OrderItemEvent'),('OrderDeliveryFeedback')) required(name);
SELECT required.table_name, required.column_name,
       actual.column_name IS NOT NULL AS present,
       actual.data_type, actual.is_nullable
FROM (VALUES
 ('User','chatwootAgentId'), ('User','chatwootContactId'),
 ('OrderItem','status'), ('OrderItem','dispatchNote'), ('OrderItem','dispatchedAt'),
 ('OrderItem','buyerDeliveryComment'), ('OrderItem','buyerDeliveryRating'),
 ('OrderItem','rejectedAt'), ('OrderItem','rejectionReason')
) required(table_name,column_name)
LEFT JOIN information_schema.columns actual
ON actual.table_schema='public' AND actual.table_name=required.table_name AND actual.column_name=required.column_name;
SELECT required.name AS required_enum, EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' AND t.typname=required.name) AS present
FROM (VALUES ('OrderItemStatus'),('ReturnRequestStatus')) required(name);
SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS migration_history_available;
ROLLBACK;
-- If migration_history_available is true, separately collect only this metadata:
-- SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
-- FROM "_prisma_migrations" ORDER BY started_at;
-- Never include migration logs or application rows in a shared readiness report.
-- Forward repair is deliberately not rerunnable over undeclared objects. If already
-- present, compare migration history/checksums and the contract audit before adoption.
-- These are exact uniqueness gates used by idempotent settlement/review workflows:
BEGIN TRANSACTION READ ONLY;
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
 ('SupplierLedger_reference_key','SupplierLedger',ARRAY['reference']),
 ('ReturnRequest_orderId_productId_key','ReturnRequest',ARRAY['orderId','productId']),
 ('OrderDeliveryFeedback_orderId_productId_key','OrderDeliveryFeedback',ARRAY['orderId','productId']),
 ('Message_chatwootId_key','Message',ARRAY['chatwootId']),
 ('Conversation_chatwootConversationId_key','Conversation',ARRAY['chatwootConversationId'])
) required(name,table_name,columns);
SELECT t.typname::text AS enum_name, string_agg(e.enumlabel,',' ORDER BY e.enumsortorder) AS ordered_labels
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typname IN ('OrderItemStatus','ReturnRequestStatus') GROUP BY t.typname;
ROLLBACK;
