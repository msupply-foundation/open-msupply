-- Optional follow-up to seed_perf_properties.sqlite.sql.
--
-- Adds 30 V2 property definitions (10 text, 10 number, 5 option, 5 date) and
-- populates them with *variably sparse* per-store coverage — each property has
-- its own fill rate spread across 5%..94%, so different stores carry different
-- subsets. This mirrors a realistic deployment where a configurable property
-- set is partially populated across the dataset.
--
-- Mirrored into legacy `name.properties` + the JSONB twin so the three-way
-- perf comparison sees the same shape; `properties_jsonb` is rebuilt at the
-- end via `jsonb(...)` once `properties` is patched.
--
-- Run AFTER seed_perf_properties.sqlite.sql — it depends on the perf_store_%
-- rows already existing. Idempotent (deterministic IDs + ON CONFLICT no-ops).
--
-- Usage:
--   sqlite3 path/to/omsupply.sqlite < server/scripts/seed_perf_sparse_properties.sqlite.sql

PRAGMA foreign_keys = ON;
PRAGMA recursive_triggers = ON;

BEGIN;

-- 1) Build the property catalog into a temp table so subsequent statements
--    don't have to repeat the recursive CTE.
DROP TABLE IF EXISTS _sparse_p_def;
CREATE TEMP TABLE _sparse_p_def (
  idx     INTEGER PRIMARY KEY,
  ptype   TEXT NOT NULL,    -- 'text' | 'number' | 'option' | 'date'
  pid     TEXT NOT NULL,    -- property_v2.id
  jkey    TEXT NOT NULL,    -- key used in the legacy JSON blob
  density INTEGER NOT NULL  -- 0..100 — % of stores that carry a value
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
  -- 5..94, spread "shuffled" across the 30 properties so neighbours don't
  -- share a fill rate. gcd(17, 90) = 1 → all 90 buckets visited.
  5 + (idx * 17) % 90
FROM p_idx
;

-- 2) Insert the V2 property definitions.
INSERT OR IGNORE INTO property_v2 (id, type, name, translation_key, deleted_datetime)
SELECT pid, ptype, 'Sparse ' || pid, NULL, NULL FROM _sparse_p_def
;

-- 3) Attach them to the `name` table.
INSERT OR IGNORE INTO property_v2_table (id, property_id, table_name)
SELECT pid || '_t', pid, 'name' FROM _sparse_p_def
;

-- 3b) Legacy property registrations so the UI renders a column per sparse
--     key reading from name.properties. (Without these, the JSON keys are
--     present but the UI has no `name_property` row pointing at them.)
INSERT OR IGNORE INTO property (id, key, name, value_type, allowed_values)
SELECT
  'perf_sparse_prop_' || jkey,
  jkey,
  'Sparse ' || jkey,
  CASE ptype
    WHEN 'text'   THEN 'STRING'
    WHEN 'number' THEN 'INTEGER'
    WHEN 'date'   THEN 'DATE'
    WHEN 'option' THEN 'STRING'
  END,
  CASE ptype WHEN 'option' THEN 'Opt 1,Opt 2,Opt 3,Opt 4' ELSE NULL END
FROM _sparse_p_def
;

INSERT OR IGNORE INTO name_property (id, property_id, remote_editable)
SELECT 'perf_sparse_np_' || jkey, 'perf_sparse_prop_' || jkey, 1
FROM _sparse_p_def
;

-- 4) Options for each of the 5 option-typed sparse properties (4 each = 20).
WITH RECURSIVE opt_idx(i) AS (
  SELECT 1 UNION ALL SELECT i + 1 FROM opt_idx WHERE i < 4
)
INSERT OR IGNORE INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime)
SELECT
  p.pid || '_opt_' || o.i,
  p.pid,
  'Opt ' || o.i,
  NULL,
  NULL
FROM _sparse_p_def p
CROSS JOIN opt_idx o
WHERE p.ptype = 'option'
;

-- 5) Variably-sparse value rows. For each (store, property) pair, populate
--    iff `((i * 31 + p_idx * 47) % 100) < density`. The (31, 47) coefficients
--    are coprime with 100 so neighbouring stores get different subsets.
INSERT OR IGNORE INTO property_v2_value (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
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
  FROM name WHERE id LIKE 'perf_store_%'
) s
CROSS JOIN _sparse_p_def p
WHERE ((s.sidx * 31 + p.idx * 47) % 100) < p.density
;

-- 6) Patch the legacy JSON blob (and JSONB twin) with the same sparse keys
--    so the legacy paths can be benchmarked against the same data shape.
--    Aggregates from the rows just inserted — keyed by the catalog `jkey`.
UPDATE name
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
          -- Store the option's display name, matching the dense seed's
          -- "favourite_bean":"Pinto" convention (rather than the option id).
          WHEN 'option' THEN (
            SELECT pvo.name FROM property_v2_option pvo
            WHERE pvo.id = pv.value_option_id
          )
        END
      )
      FROM property_v2_value pv
      JOIN _sparse_p_def p ON p.pid = pv.property_id
      WHERE pv.table_name = 'name' AND pv.record_id = name.id
    ),
    '{}'
  )
)
WHERE id LIKE 'perf_store_%'
;

-- 7) Rebuild the JSONB twin column from the patched text JSON.
UPDATE name
SET properties_jsonb = jsonb(properties)
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL
;

DROP TABLE _sparse_p_def;

COMMIT;
