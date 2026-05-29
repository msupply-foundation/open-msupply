-- OMS-mode one-time fixtures for the perf comparison. Run BEFORE
-- seed_perf_dense.postgres.sql / seed_perf_sparse.postgres.sql so the FK
-- targets (property_v2.id, property.id) exist before
-- property_v2_value.property_id / property_v2_option.property_id reference
-- them.
--
-- Idempotent — ON CONFLICT (id) DO NOTHING on deterministic IDs.

BEGIN;

-- ----- Dense property definitions -------------------------------------------
INSERT INTO property (id, key, name, value_type, allowed_values) VALUES
  ('perf_prop_beans_thoughts', 'beans_thoughts', 'Thoughts on beans', 'STRING',  NULL),
  ('perf_prop_beans_count',    'beans_count',    'Beans',             'INTEGER', NULL),
  ('perf_prop_favourite_bean', 'favourite_bean', 'Favourite Bean',    'STRING',  'Black,Pinto,Navy,Kidney,Lima'),
  ('perf_prop_visit_date',     'visit_date',     'Visit date',        'DATE',    NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO name_property (id, property_id, remote_editable) VALUES
  ('perf_np_beans_thoughts', 'perf_prop_beans_thoughts', TRUE),
  ('perf_np_beans_count',    'perf_prop_beans_count',    TRUE),
  ('perf_np_favourite_bean', 'perf_prop_favourite_bean', TRUE),
  ('perf_np_visit_date',     'perf_prop_visit_date',     TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO property_v2 (id, type, name, translation_key, deleted_datetime) VALUES
  ('perf_propv2_beans_thoughts', 'text',   'Thoughts on beans', NULL, NULL),
  ('perf_propv2_beans_count',    'number', 'Beans',             NULL, NULL),
  ('perf_propv2_favourite_bean', 'option', 'Favourite Bean',    NULL, NULL),
  ('perf_propv2_visit_date',     'date',   'Visit date',        NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO property_v2_table (id, property_id, table_name) VALUES
  ('perf_propv2t_beans_thoughts', 'perf_propv2_beans_thoughts', 'name'),
  ('perf_propv2t_beans_count',    'perf_propv2_beans_count',    'name'),
  ('perf_propv2t_favourite_bean', 'perf_propv2_favourite_bean', 'name'),
  ('perf_propv2t_visit_date',     'perf_propv2_visit_date',     'name')
ON CONFLICT (id) DO NOTHING;

INSERT INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime) VALUES
  ('perf_opt_bean_black',  'perf_propv2_favourite_bean', 'Black',  NULL, NULL),
  ('perf_opt_bean_pinto',  'perf_propv2_favourite_bean', 'Pinto',  NULL, NULL),
  ('perf_opt_bean_navy',   'perf_propv2_favourite_bean', 'Navy',   NULL, NULL),
  ('perf_opt_bean_kidney', 'perf_propv2_favourite_bean', 'Kidney', NULL, NULL),
  ('perf_opt_bean_lima',   'perf_propv2_favourite_bean', 'Lima',   NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ----- Sparse property definitions (30 props) -------------------------------
WITH p_idx AS (SELECT generate_series(0, 29) AS idx)
INSERT INTO property_v2 (id, type, name, translation_key, deleted_datetime)
SELECT
  CASE
    WHEN idx < 10 THEN 'perf_sparse_propv2_text_' || lpad((idx + 1)::text, 2, '0')
    WHEN idx < 20 THEN 'perf_sparse_propv2_num_'  || lpad((idx - 9)::text, 2, '0')
    WHEN idx < 25 THEN 'perf_sparse_propv2_opt_'  || lpad((idx - 19)::text, 2, '0')
    ELSE              'perf_sparse_propv2_date_'  || lpad((idx - 24)::text, 2, '0')
  END,
  CASE
    WHEN idx < 10 THEN 'text'
    WHEN idx < 20 THEN 'number'
    WHEN idx < 25 THEN 'option'
    ELSE              'date'
  END,
  'Sparse property ' || idx, NULL, NULL
FROM p_idx
ON CONFLICT (id) DO NOTHING;

WITH p_idx AS (SELECT generate_series(0, 29) AS idx)
INSERT INTO property_v2_table (id, property_id, table_name)
SELECT
  (CASE
     WHEN idx < 10 THEN 'perf_sparse_propv2_text_' || lpad((idx + 1)::text, 2, '0')
     WHEN idx < 20 THEN 'perf_sparse_propv2_num_'  || lpad((idx - 9)::text, 2, '0')
     WHEN idx < 25 THEN 'perf_sparse_propv2_opt_'  || lpad((idx - 19)::text, 2, '0')
     ELSE              'perf_sparse_propv2_date_'  || lpad((idx - 24)::text, 2, '0')
   END) || '_t',
  CASE
    WHEN idx < 10 THEN 'perf_sparse_propv2_text_' || lpad((idx + 1)::text, 2, '0')
    WHEN idx < 20 THEN 'perf_sparse_propv2_num_'  || lpad((idx - 9)::text, 2, '0')
    WHEN idx < 25 THEN 'perf_sparse_propv2_opt_'  || lpad((idx - 19)::text, 2, '0')
    ELSE              'perf_sparse_propv2_date_'  || lpad((idx - 24)::text, 2, '0')
  END,
  'name'
FROM p_idx
ON CONFLICT (id) DO NOTHING;

-- Sparse options (4 per option-type sparse property × 5 = 20).
INSERT INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime)
SELECT
  'perf_sparse_propv2_opt_' || lpad((p.idx - 19)::text, 2, '0') || '_opt_' || o.i,
  'perf_sparse_propv2_opt_' || lpad((p.idx - 19)::text, 2, '0'),
  'Opt ' || o.i,
  NULL, NULL
FROM (SELECT generate_series(20, 24) AS idx) p
CROSS JOIN generate_series(1, 4) AS o(i)
ON CONFLICT (id) DO NOTHING;

COMMIT;
