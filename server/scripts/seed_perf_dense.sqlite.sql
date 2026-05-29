-- Unified dense seed for SQLite — works in both modes.
--
-- Placeholders (substituted by perf_sql_test.py):
--   __SIZE__               — number of stores to generate
--   __NAME_TABLE__         — `name` (OMS) or `perf_name_<N>` (standalone)
--   __PV2_VALUE_TABLE__    — `property_v2_value` or `perf_pv2_value_<N>`
--
-- Idempotent (INSERT OR IGNORE on deterministic IDs).
--
-- Prerequisites:
--   OMS mode:        init_perf_oms_metadata.sqlite.sql (property_v2 defs,
--                    option defs, FK targets).
--   Standalone mode: init_perf_schema.sql (per-size tables, option defs).

BEGIN;

-- 1) Generate N stores. printf('%07d', i) expands without truncation.
WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < __SIZE__
)
INSERT OR IGNORE INTO __NAME_TABLE__ (id, properties)
SELECT
  printf('perf_store_%07d', i),
  '{"beans_thoughts":"Thoughts on beans for store ' || i || '",' ||
   '"beans_count":' || ((i * 7) % 100) || ',' ||
   '"favourite_bean":"' ||
   CASE (i % 5)
     WHEN 0 THEN 'Black'
     WHEN 1 THEN 'Pinto'
     WHEN 2 THEN 'Navy'
     WHEN 3 THEN 'Kidney'
     ELSE        'Lima'
   END || '",' ||
   '"visit_date":"' || strftime('%Y-%m-%d', DATE('2025-01-01', '+' || ((i - 1) % 365) || ' days')) || '",' ||
   '"metadata":{' ||
     '"schema_version":3,' ||
     '"tags":["alpha","beta","gamma","delta","epsilon"],' ||
     '"flags":{"active":true,"verified":false,"audit":true,"experimental":false,"premium":true},' ||
     '"audit":{' ||
       '"created_at":"2025-01-15T08:30:00Z",' ||
       '"updated_at":"2025-06-20T14:45:00Z",' ||
       '"version":42,' ||
       '"hash":"abc123def456",' ||
       '"signers":["alice","bob","charlie"]' ||
     '},' ||
     '"location":{' ||
       '"latitude":-41.2865,' ||
       '"longitude":174.7762,' ||
       '"region":"Wellington",' ||
       '"timezone":"Pacific/Auckland",' ||
       '"elevation":150,' ||
       '"address":{' ||
         '"country":"NZ",' ||
         '"postcode":"6011",' ||
         '"district":"Central",' ||
         '"primary":{' ||
           '"street_number":' || ((i % 99) + 1) || ',' ||
           '"street":"Lambton Quay",' ||
           '"suburb":"Te Aro",' ||
           '"city":"City ' || (i % 100) || '",' ||
           '"unit":"' || i || 'A"' ||
         '}' ||
       '}' ||
     '}' ||
   '}' ||
  '}'
FROM seq;

-- 2) JSONB twin (SQLite stores as TEXT either way; the column lets the
--    json_extract on `properties_jsonb` queries match what OMS does).
UPDATE __NAME_TABLE__
SET properties_jsonb = properties
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL AND properties_jsonb IS NULL;

-- 3) Property v2 values — one row per (store, property), table_name='name'.
INSERT OR IGNORE INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_thoughts_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_thoughts',
  'Thoughts on beans for store ' || CAST(substr(id, length('perf_store_') + 1) AS INTEGER),
  NULL, NULL, NULL, NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%';

INSERT OR IGNORE INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_count_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_count',
  NULL,
  (CAST(substr(id, length('perf_store_') + 1) AS INTEGER) * 7) % 100,
  NULL, NULL, NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%';

INSERT OR IGNORE INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_favbean_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_favourite_bean',
  NULL, NULL, NULL, NULL,
  CASE (CAST(substr(id, length('perf_store_') + 1) AS INTEGER) % 5)
    WHEN 0 THEN 'perf_opt_bean_black'
    WHEN 1 THEN 'perf_opt_bean_pinto'
    WHEN 2 THEN 'perf_opt_bean_navy'
    WHEN 3 THEN 'perf_opt_bean_kidney'
    ELSE        'perf_opt_bean_lima'
  END
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%';

INSERT OR IGNORE INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_visitdate_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_visit_date',
  NULL, NULL, NULL,
  DATE('2025-01-01', '+' || ((CAST(substr(id, length('perf_store_') + 1) AS INTEGER) - 1) % 365) || ' days'),
  NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%';

COMMIT;
