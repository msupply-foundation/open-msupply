-- Unified sparse seed for Postgres. Works in both modes.
--
-- Placeholders:
--   __SIZE__              — number of stores (informational)
--   __NAME_TABLE__        — `name` or `perf_name_<N>`
--   __PV2_VALUE_TABLE__   — `property_v2_value` or `perf_pv2_value_<N>`
--   __PV2_OPTION_TABLE__  — `property_v2_option` or `perf_pv2_option`
--
-- 30 sparse properties × variably-sparse density 5%..94%. Idempotent.

BEGIN;

-- 1) Property catalog in a temp table.
CREATE TEMP TABLE _sparse_p_def (
  idx     INTEGER PRIMARY KEY,
  ptype   TEXT NOT NULL,
  pid     TEXT NOT NULL,
  jkey    TEXT NOT NULL,
  density INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO _sparse_p_def (idx, ptype, pid, jkey, density)
SELECT
  idx,
  CASE
    WHEN idx < 10 THEN 'text'
    WHEN idx < 20 THEN 'number'
    WHEN idx < 25 THEN 'option'
    ELSE              'date'
  END,
  CASE
    WHEN idx < 10 THEN 'perf_sparse_propv2_text_' || lpad((idx + 1)::text, 2, '0')
    WHEN idx < 20 THEN 'perf_sparse_propv2_num_'  || lpad((idx - 9)::text, 2, '0')
    WHEN idx < 25 THEN 'perf_sparse_propv2_opt_'  || lpad((idx - 19)::text, 2, '0')
    ELSE              'perf_sparse_propv2_date_'  || lpad((idx - 24)::text, 2, '0')
  END,
  CASE
    WHEN idx < 10 THEN 'sparse_text_' || lpad((idx + 1)::text, 2, '0')
    WHEN idx < 20 THEN 'sparse_num_'  || lpad((idx - 9)::text, 2, '0')
    WHEN idx < 25 THEN 'sparse_opt_'  || lpad((idx - 19)::text, 2, '0')
    ELSE              'sparse_date_'  || lpad((idx - 24)::text, 2, '0')
  END,
  5 + (idx * 17) % 90
FROM generate_series(0, 29) AS g(idx);

-- 2) Variably-sparse value rows.
INSERT INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_sparse_pv2val_' || s.sidx || '_' || lpad(p.idx::text, 2, '0'),
  'name',
  s.id,
  p.pid,
  CASE p.ptype WHEN 'text'   THEN 'sparse value s' || s.sidx || ' p' || p.idx ELSE NULL END,
  CASE p.ptype WHEN 'number' THEN (s.sidx * (p.idx + 1) + 7) % 200             ELSE NULL END,
  NULL,
  CASE p.ptype WHEN 'date'
    THEN DATE '2025-01-01' + ((s.sidx * (p.idx + 1)) % 365)
    ELSE NULL END,
  CASE p.ptype WHEN 'option'
    THEN p.pid || '_opt_' || ((s.sidx % 4) + 1)
    ELSE NULL END
FROM (
  SELECT id, CAST(substr(id, length('perf_store_') + 1) AS INTEGER) AS sidx
  FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
) s
CROSS JOIN _sparse_p_def p
WHERE ((s.sidx * 31 + p.idx * 47) % 100) < p.density
ON CONFLICT (id) DO NOTHING;

-- 3) Patch the legacy JSON blob with the sparse keys.
UPDATE __NAME_TABLE__
SET properties = (
  COALESCE(__NAME_TABLE__.properties::jsonb, '{}'::jsonb)
  || COALESCE(s.sparse_jsonb, '{}'::jsonb)
)::text
FROM (
  SELECT
    pv.record_id,
    jsonb_object_agg(
      p.jkey,
      CASE p.ptype
        WHEN 'text'   THEN to_jsonb(pv.value_text)
        WHEN 'number' THEN to_jsonb(pv.value_number)
        WHEN 'date'   THEN to_jsonb(to_char(pv.value_date, 'YYYY-MM-DD'))
        WHEN 'option' THEN to_jsonb((
          SELECT pvo.name FROM __PV2_OPTION_TABLE__ pvo WHERE pvo.id = pv.value_option_id
        ))
      END
    ) AS sparse_jsonb
  FROM __PV2_VALUE_TABLE__ pv
  JOIN _sparse_p_def p ON p.pid = pv.property_id
  WHERE pv.table_name = 'name'
  GROUP BY pv.record_id
) s
WHERE __NAME_TABLE__.id = s.record_id AND __NAME_TABLE__.id LIKE 'perf_store_%';

-- 4) Rebuild JSONB twin.
UPDATE __NAME_TABLE__
SET properties_jsonb = properties::jsonb
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL;

COMMIT;
