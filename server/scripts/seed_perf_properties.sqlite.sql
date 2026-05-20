-- Seeds three example name properties + many thousands of stores carrying
-- values for both the legacy JSON system and the V2 relational prototype.
-- Designed for the legacy-vs-V2-vs-JSONB perf comparison on the stores list.
--
-- Idempotent: re-running upserts/no-ops on existing rows. Property values for
-- previously-seeded stores are *not* mutated on re-run — only newly-created
-- stores get fresh values. Adjust :store_count below to scale the dataset.
--
-- Requires SQLite >= 3.45 for the `jsonb(...)` function (the prototype's
-- read-only properties_jsonb column is populated at the end).
--
-- Usage:
--   sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_properties.sqlite.sql

PRAGMA foreign_keys = ON;
PRAGMA recursive_triggers = ON;

BEGIN;

-- 1) Legacy property definitions (1 per type the prototype exercises).
INSERT OR IGNORE INTO property (id, key, name, value_type, allowed_values) VALUES
  ('perf_prop_beans_thoughts', 'beans_thoughts', 'Thoughts on beans', 'STRING',  NULL),
  ('perf_prop_beans_count',    'beans_count',    'Beans',             'INTEGER', NULL),
  ('perf_prop_favourite_bean', 'favourite_bean', 'Favourite Bean',    'STRING',  'Black,Pinto,Navy,Kidney,Lima')
;

-- 2) Attach each property definition to the names context.
INSERT OR IGNORE INTO name_property (id, property_id, remote_editable) VALUES
  ('perf_np_beans_thoughts', 'perf_prop_beans_thoughts', 1),
  ('perf_np_beans_count',    'perf_prop_beans_count',    1),
  ('perf_np_favourite_bean', 'perf_prop_favourite_bean', 1)
;

-- 3) Property V2 definitions — mirrors the legacy set for an apples-to-apples
--    comparison. Types use the strings the V2 service expects (TEXT/NUMBER/OPTION).
INSERT OR IGNORE INTO property_v2 (id, type, name, translation_key, deleted_datetime) VALUES
  ('perf_propv2_beans_thoughts', 'text',   'Thoughts on beans', NULL, NULL),
  ('perf_propv2_beans_count',    'number', 'Beans',             NULL, NULL),
  ('perf_propv2_favourite_bean', 'option', 'Favourite Bean',    NULL, NULL)
;

-- 4) Attach the V2 properties to the `name` table.
INSERT OR IGNORE INTO property_v2_table (id, property_id, table_name) VALUES
  ('perf_propv2t_beans_thoughts', 'perf_propv2_beans_thoughts', 'name'),
  ('perf_propv2t_beans_count',    'perf_propv2_beans_count',    'name'),
  ('perf_propv2t_favourite_bean', 'perf_propv2_favourite_bean', 'name')
;

-- 5) Options for the `Favourite Bean` V2 property.
INSERT OR IGNORE INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime) VALUES
  ('perf_opt_bean_black',  'perf_propv2_favourite_bean', 'Black',  NULL, NULL),
  ('perf_opt_bean_pinto',  'perf_propv2_favourite_bean', 'Pinto',  NULL, NULL),
  ('perf_opt_bean_navy',   'perf_propv2_favourite_bean', 'Navy',   NULL, NULL),
  ('perf_opt_bean_kidney', 'perf_propv2_favourite_bean', 'Kidney', NULL, NULL),
  ('perf_opt_bean_lima',   'perf_propv2_favourite_bean', 'Lima',   NULL, NULL)
;

-- 6) Generate the dataset of stores. Edit the `WHERE i < N` clause below to
--    scale (default 10000). IDs are deterministic so re-runs no-op cleanly.
WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < 10000
)
INSERT OR IGNORE INTO name (
  id, name, code,
  is_customer, is_supplier, type,
  on_hold, is_manufacturer, is_donor, is_deceased, is_sync_update,
  properties
)
SELECT
  printf('perf_store_%05d', i),
  printf('Perf Store %05d', i),
  printf('PS%05d', i),
  0, 0, 'STORE',
  0, 0, 0, 0, 0,
  '{"beans_thoughts":"Thoughts on beans for store ' || i || '",' ||
   '"beans_count":' || ((i * 7) % 100) || ',' ||
   '"favourite_bean":"' ||
   CASE (i % 5)
     WHEN 0 THEN 'Black'
     WHEN 1 THEN 'Pinto'
     WHEN 2 THEN 'Navy'
     WHEN 3 THEN 'Kidney'
     ELSE        'Lima'
   END || '"}'
FROM seq
;

-- 7) name_link rows (PK == name_id for these synthetic stores).
INSERT OR IGNORE INTO name_link (id, name_id)
SELECT id, id FROM name WHERE id LIKE 'perf_store_%'
;

-- 8) store rows so the names show up on the stores list page.
INSERT OR IGNORE INTO store (id, name_link_id, code, site_id, store_mode, is_disabled)
SELECT id, id, code, 1, 'STORE', 0
FROM name WHERE id LIKE 'perf_store_%'
;

-- 9) Populate the read-only JSONB twin column from the text-JSON source.
--    Always runs — cheap, idempotent (same input → same output).
UPDATE name
SET properties_jsonb = jsonb(properties)
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL;

-- 10) Matching property_v2_value rows — one per (store, property). Deterministic
--     IDs so re-runs no-op via ON CONFLICT.
INSERT OR IGNORE INTO property_v2_value (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_thoughts_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_thoughts',
  'Thoughts on beans for store ' || CAST(substr(id, length('perf_store_') + 1) AS INTEGER),
  NULL, NULL, NULL, NULL
FROM name WHERE id LIKE 'perf_store_%'
;

INSERT OR IGNORE INTO property_v2_value (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_pv2val_count_' || substr(id, length('perf_store_') + 1),
  'name', id, 'perf_propv2_beans_count',
  NULL,
  (CAST(substr(id, length('perf_store_') + 1) AS INTEGER) * 7) % 100,
  NULL, NULL, NULL
FROM name WHERE id LIKE 'perf_store_%'
;

INSERT OR IGNORE INTO property_v2_value (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
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
FROM name WHERE id LIKE 'perf_store_%'
;

COMMIT;
