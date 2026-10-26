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
