-- Metadata only. Use an already-authorized read-only connection; no credentials in CLI args.
-- psql -X -At --file scripts/export-production-baseline.sql > baseline.jsonl
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '1s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SELECT json_build_object(
 'report_version',1,
 'database',current_database(),
 'server_version_num',current_setting('server_version_num'),
 'transaction_read_only',current_setting('transaction_read_only'),
 'tables',COALESCE((SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'),'[]'::json),
 'columns',COALESCE((SELECT json_agg(c ORDER BY table_name,ordinal_position) FROM (
   SELECT table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,numeric_precision,numeric_scale,datetime_precision
   FROM information_schema.columns WHERE table_schema='public'
 ) c),'[]'::json),
 'enums',COALESCE((SELECT json_agg(e ORDER BY name,position) FROM (
   SELECT t.typname AS name,e.enumlabel AS label,e.enumsortorder AS position
   FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public'
 ) e),'[]'::json),
 'indexes',COALESCE((SELECT json_agg(x ORDER BY table_name,index_name) FROM (
   SELECT c.relname AS table_name,ix.relname AS index_name,i.indisunique AS unique_index,i.indisvalid AS valid,i.indisready AS ready,
    i.indpred IS NOT NULL AS partial,i.indexprs IS NOT NULL AS expression,
    ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY k(attnum,position)
      LEFT JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE k.position<=i.indnkeyatts ORDER BY k.position) AS key_columns
   FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 ) x),'[]'::json),
 'constraints',COALESCE((SELECT json_agg(c ORDER BY table_name,name) FROM (
   SELECT r.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS validated
   FROM pg_constraint k JOIN pg_class r ON r.oid=k.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public'
 ) c),'[]'::json)
)::jsonb;
SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS has_history \gset
\if :has_history
SELECT json_build_object('migration_history',COALESCE(json_agg(m ORDER BY started_at,migration_name),'[]'::json))::jsonb FROM (
 SELECT migration_name,checksum,started_at,finished_at,rolled_back_at,applied_steps_count FROM public._prisma_migrations
) m;
\else
SELECT json_build_object('migration_history',NULL);
\endif
ROLLBACK;
-- Deliberately excludes application rows, defaults, index/check expressions, comments,
-- user/role names, connection strings, credentials and migration error logs.
