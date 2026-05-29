-- Unified sparse seed for SQLite. Works in both modes.
--
-- Placeholders:
--   __SIZE__              — number of stores (informational; rows count
--                           depends on the existing perf_store_% rows in
--                           __NAME_TABLE__).
--   __NAME_TABLE__        — `name` (OMS) or `perf_name_<N>` (standalone)
--   __PV2_VALUE_TABLE__   — `property_v2_value` or `perf_pv2_value_<N>`
--   __PV2_OPTION_TABLE__  — `property_v2_option` or `perf_pv2_option`
--
-- 30 sparse properties (10 text / 10 number / 5 option × 4 opts each / 5
-- date) populated at variable density 5%..94%. Idempotent.
-- Depends on the dense seed (and the appropriate init script) — needs
-- perf_store_% rows already in __NAME_TABLE__ and sparse option defs
-- already in __PV2_OPTION_TABLE__.

PRAGMA recursive_triggers = ON;

BEGIN;

-- 1) Property catalog in a temp table.
DROP TABLE IF EXISTS _sparse_p_def;
CREATE TEMP TABLE _sparse_p_def (
  idx     INTEGER PRIMARY KEY,
  ptype   TEXT NOT NULL,
  pid     TEXT NOT NULL,
  jkey    TEXT NOT NULL,
  density INTEGER NOT NULL
);

WITH RECURSIVE p_idx(idx) AS (
  SELECT 0 UNION ALL SELECT idx + 1 FROM p_idx WHERE idx < 29
)
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
    WHEN idx < 10 THEN printf('perf_sparse_propv2_text_%02d', idx + 1)
    WHEN idx < 20 THEN printf('perf_sparse_propv2_num_%02d',  idx - 9)
    WHEN idx < 25 THEN printf('perf_sparse_propv2_opt_%02d',  idx - 19)
    ELSE              printf('perf_sparse_propv2_date_%02d',  idx - 24)
  END,
  CASE
    WHEN idx < 10 THEN printf('sparse_text_%02d', idx + 1)
    WHEN idx < 20 THEN printf('sparse_num_%02d',  idx - 9)
    WHEN idx < 25 THEN printf('sparse_opt_%02d',  idx - 19)
    ELSE              printf('sparse_date_%02d',  idx - 24)
  END,
  5 + (idx * 17) % 90
FROM p_idx;

-- 2) Variably-sparse value rows. Populate if `(i*31 + p_idx*47) % 100 < density`.
INSERT OR IGNORE INTO __PV2_VALUE_TABLE__
  (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
SELECT
  'perf_sparse_pv2val_' || s.sidx || '_' || printf('%02d', p.idx),
  'name',
  s.id,
  p.pid,
  CASE p.ptype WHEN 'text'   THEN 'sparse value s' || s.sidx || ' p' || p.idx ELSE NULL END,
  CASE p.ptype WHEN 'number' THEN (s.sidx * (p.idx + 1) + 7) % 200             ELSE NULL END,
  NULL,
  CASE p.ptype WHEN 'date'
    THEN date('2025-01-01', '+' || ((s.sidx * (p.idx + 1)) % 365) || ' days')
    ELSE NULL END,
  CASE p.ptype WHEN 'option'
    THEN p.pid || '_opt_' || ((s.sidx % 4) + 1)
    ELSE NULL END
FROM (
  SELECT id, CAST(substr(id, length('perf_store_') + 1) AS INTEGER) AS sidx
  FROM __NAME_TABLE__ WHERE id LIKE 'perf_store_%'
) s
CROSS JOIN _sparse_p_def p
WHERE ((s.sidx * 31 + p.idx * 47) % 100) < p.density;

-- 3) Patch legacy JSON blob so legacy paths benchmark against the same data.
UPDATE __NAME_TABLE__
SET properties = json_patch(
  COALESCE(properties, '{}'),
  COALESCE(
    (
      SELECT json_group_object(
        p.jkey,
        CASE p.ptype
          WHEN 'text'   THEN pv.value_text
          WHEN 'number' THEN pv.value_number
          WHEN 'date'   THEN pv.value_date
          WHEN 'option' THEN (
            SELECT pvo.name FROM __PV2_OPTION_TABLE__ pvo WHERE pvo.id = pv.value_option_id
          )
        END
      )
      FROM __PV2_VALUE_TABLE__ pv
      JOIN _sparse_p_def p ON p.pid = pv.property_id
      WHERE pv.table_name = 'name' AND pv.record_id = __NAME_TABLE__.id
    ),
    '{}'
  )
)
WHERE id LIKE 'perf_store_%';

-- 4) Rebuild JSONB twin.
UPDATE __NAME_TABLE__
SET properties_jsonb = properties
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL;

DROP TABLE _sparse_p_def;

COMMIT;
