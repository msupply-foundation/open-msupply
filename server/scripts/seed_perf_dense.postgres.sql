-- Unified dense seed for Postgres — works in both modes.
--
-- Placeholders (substituted by perf_sql_test.py):
--   __SIZE__               — number of stores to generate
--   __NAME_TABLE__         — `name` (OMS) or `perf_name_<N>` (standalone)
--   __PV2_VALUE_TABLE__    — `property_v2_value` or `perf_pv2_value_<N>`
--
-- Idempotent (ON CONFLICT (id) DO NOTHING).
--
-- Prerequisites: see seed_perf_dense.sqlite.sql header.

BEGIN;

-- 1) Generate N stores. lpad to 7 chars supports up to 9,999,999 IDs.
WITH seq AS (SELECT generate_series(1, __SIZE__) AS i)
INSERT INTO __NAME_TABLE__ (id, properties)
SELECT
  'perf_store_' || lpad(i::text, 7, '0'),
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
   '"visit_date":"' || to_char(DATE '2025-01-01' + ((i - 1) % 365), 'YYYY-MM-DD') || '",' ||
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
FROM seq
ON CONFLICT (id) DO NOTHING;

-- 2) JSONB twin column from the TEXT JSON.
UPDATE __NAME_TABLE__
SET properties_jsonb = properties::jsonb
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL AND properties_jsonb IS NULL;

-- 3) Property v2 values.
INSERT INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_thoughts_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_thoughts',
  'Thoughts on beans for store ' || CAST(substr(id, length('perf_store_') + 1) AS INTEGER),
  NULL, NULL, NULL, NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_count_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_count',
  NULL,
  (CAST(substr(id, length('perf_store_') + 1) AS INTEGER) * 7) % 100,
  NULL, NULL, NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO __PV2_VALUE_TABLE__
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
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
ON CONFLICT (id) DO NOTHING;

INSERT INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_visitdate_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_visit_date',
  NULL, NULL, NULL,
  DATE '2025-01-01' + ((CAST(substr(id, length('perf_store_') + 1) AS INTEGER) - 1) % 365),
  NULL
FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
ON CONFLICT (id) DO NOTHING;

COMMIT;
