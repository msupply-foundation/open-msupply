-- OMS-mode one-time fixtures for the perf comparison. Run BEFORE
-- seed_perf_dense.sqlite.sql / seed_perf_sparse.sqlite.sql so the FK
-- targets (property_v2.id, property.id) exist before
-- property_v2_value.property_id / property_v2_option.property_id reference
-- them.
--
-- Idempotent — INSERT OR IGNORE on deterministic IDs. Safe to re-run.
--
-- Standalone mode uses init_perf_schema.sql instead (doesn't need any of
-- this — perf_pv2_value / perf_pv2_option carry no FKs to property_v2).

BEGIN;

-- ----- Dense property definitions -------------------------------------------
INSERT OR IGNORE INTO property (id, key, name, value_type, allowed_values) VALUES
  ('perf_prop_beans_thoughts', 'beans_thoughts', 'Thoughts on beans', 'STRING',  NULL),
  ('perf_prop_beans_count',    'beans_count',    'Beans',             'INTEGER', NULL),
  ('perf_prop_favourite_bean', 'favourite_bean', 'Favourite Bean',    'STRING',  'Black,Pinto,Navy,Kidney,Lima'),
  ('perf_prop_visit_date',     'visit_date',     'Visit date',        'DATE',    NULL);

INSERT OR IGNORE INTO name_property (id, property_id, remote_editable) VALUES
  ('perf_np_beans_thoughts', 'perf_prop_beans_thoughts', 1),
  ('perf_np_beans_count',    'perf_prop_beans_count',    1),
  ('perf_np_favourite_bean', 'perf_prop_favourite_bean', 1),
  ('perf_np_visit_date',     'perf_prop_visit_date',     1);

INSERT OR IGNORE INTO property_v2 (id, type, name, translation_key, deleted_datetime) VALUES
  ('perf_propv2_beans_thoughts', 'text',   'Thoughts on beans', NULL, NULL),
  ('perf_propv2_beans_count',    'number', 'Beans',             NULL, NULL),
  ('perf_propv2_favourite_bean', 'option', 'Favourite Bean',    NULL, NULL),
  ('perf_propv2_visit_date',     'date',   'Visit date',        NULL, NULL);

INSERT OR IGNORE INTO property_v2_table (id, property_id, table_name) VALUES
  ('perf_propv2t_beans_thoughts', 'perf_propv2_beans_thoughts', 'name'),
  ('perf_propv2t_beans_count',    'perf_propv2_beans_count',    'name'),
  ('perf_propv2t_favourite_bean', 'perf_propv2_favourite_bean', 'name'),
  ('perf_propv2t_visit_date',     'perf_propv2_visit_date',     'name');

INSERT OR IGNORE INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime) VALUES
  ('perf_opt_bean_black',  'perf_propv2_favourite_bean', 'Black',  NULL, NULL),
  ('perf_opt_bean_pinto',  'perf_propv2_favourite_bean', 'Pinto',  NULL, NULL),
  ('perf_opt_bean_navy',   'perf_propv2_favourite_bean', 'Navy',   NULL, NULL),
  ('perf_opt_bean_kidney', 'perf_propv2_favourite_bean', 'Kidney', NULL, NULL),
  ('perf_opt_bean_lima',   'perf_propv2_favourite_bean', 'Lima',   NULL, NULL);

-- ----- Sparse property definitions (30 props) -------------------------------
-- Mirrors the catalog in the unified sparse seed. Idx-driven naming so the
-- two stay in lockstep without sharing a temp table.
WITH RECURSIVE p_idx(idx) AS (
  SELECT 0 UNION ALL SELECT idx + 1 FROM p_idx WHERE idx < 29
)
INSERT OR IGNORE INTO property_v2 (id, type, name, translation_key, deleted_datetime)
SELECT
  CASE
    WHEN idx < 10 THEN printf('perf_sparse_propv2_text_%02d', idx + 1)
    WHEN idx < 20 THEN printf('perf_sparse_propv2_num_%02d',  idx - 9)
    WHEN idx < 25 THEN printf('perf_sparse_propv2_opt_%02d',  idx - 19)
    ELSE              printf('perf_sparse_propv2_date_%02d',  idx - 24)
  END,
  CASE
    WHEN idx < 10 THEN 'text'
    WHEN idx < 20 THEN 'number'
    WHEN idx < 25 THEN 'option'
    ELSE              'date'
  END,
  'Sparse property ' || idx,
  NULL, NULL
FROM p_idx;

WITH RECURSIVE p_idx(idx) AS (
  SELECT 0 UNION ALL SELECT idx + 1 FROM p_idx WHERE idx < 29
)
INSERT OR IGNORE INTO property_v2_table (id, property_id, table_name)
SELECT
  (CASE
     WHEN idx < 10 THEN printf('perf_sparse_propv2_text_%02d', idx + 1)
     WHEN idx < 20 THEN printf('perf_sparse_propv2_num_%02d',  idx - 9)
     WHEN idx < 25 THEN printf('perf_sparse_propv2_opt_%02d',  idx - 19)
     ELSE              printf('perf_sparse_propv2_date_%02d',  idx - 24)
   END) || '_t',
  CASE
    WHEN idx < 10 THEN printf('perf_sparse_propv2_text_%02d', idx + 1)
    WHEN idx < 20 THEN printf('perf_sparse_propv2_num_%02d',  idx - 9)
    WHEN idx < 25 THEN printf('perf_sparse_propv2_opt_%02d',  idx - 19)
    ELSE              printf('perf_sparse_propv2_date_%02d',  idx - 24)
  END,
  'name'
FROM p_idx;

-- Sparse options (4 per option-type sparse property × 5 = 20).
WITH RECURSIVE
  p_idx(idx) AS (SELECT 0 UNION ALL SELECT idx + 1 FROM p_idx WHERE idx < 29),
  opt_idx(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM opt_idx WHERE i < 4)
INSERT OR IGNORE INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime)
SELECT
  printf('perf_sparse_propv2_opt_%02d_opt_%d', p.idx - 19, o.i),
  printf('perf_sparse_propv2_opt_%02d',        p.idx - 19),
  'Opt ' || o.i,
  NULL, NULL
FROM p_idx p
CROSS JOIN opt_idx o
WHERE p.idx >= 20 AND p.idx < 25;

COMMIT;
