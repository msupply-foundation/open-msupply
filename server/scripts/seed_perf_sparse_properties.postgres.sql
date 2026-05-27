-- Optional follow-up to seed_perf_properties.postgres.sql.
--
-- Adds 30 V2 property definitions (10 text, 10 number, 5 option, 5 date) and
-- populates them with *variably sparse* per-store coverage — each property has
-- its own fill rate spread across 5%..94%, so different stores carry different
-- subsets. This mirrors a realistic deployment where a configurable property
-- set is partially populated across the dataset.
--
-- Mirrored into legacy `name.properties` + the JSONB twin so the three-way
-- perf comparison sees the same shape; `properties_jsonb` is rebuilt at the
-- end via `::jsonb` once `properties` is patched.
--
-- Run AFTER seed_perf_properties.postgres.sql — it depends on the perf_store_%
-- rows already existing. Idempotent (deterministic IDs + ON CONFLICT no-ops).
--
-- Usage:
--   psql "$DATABASE_URL" -f server/scripts/seed_perf_sparse_properties.postgres.sql

BEGIN;

-- 1) Build the property catalog into a temp table so subsequent statements
--    don't have to repeat the generator. Dropped at COMMIT.
CREATE TEMP TABLE _sparse_p_def (
  idx     INTEGER PRIMARY KEY,
  ptype   TEXT NOT NULL,    -- 'text' | 'number' | 'option' | 'date'
  pid     TEXT NOT NULL,    -- property_v2.id
  jkey    TEXT NOT NULL,    -- key used in the legacy JSON blob
  density INTEGER NOT NULL  -- 0..100 — % of stores that carry a value
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
  -- 5..94, spread "shuffled" across the 30 properties so neighbours don't
  -- share a fill rate. gcd(17, 90) = 1 → all 90 buckets visited.
  5 + (idx * 17) % 90
FROM generate_series(0, 29) AS g(idx)
;

-- 2) Insert the V2 property definitions.
INSERT INTO property_v2 (id, type, name, translation_key, deleted_datetime)
SELECT pid, ptype, 'Sparse ' || pid, NULL, NULL FROM _sparse_p_def
ON CONFLICT (id) DO NOTHING;

-- 3) Attach them to the `name` table.
INSERT INTO property_v2_table (id, property_id, table_name)
SELECT pid || '_t', pid, 'name' FROM _sparse_p_def
ON CONFLICT (id) DO NOTHING;

-- 3b) Legacy property registrations so the UI renders a column per sparse
--     key reading from name.properties. (Without these, the JSON keys are
--     present but the UI has no `name_property` row pointing at them.)
INSERT INTO property (id, key, name, value_type, allowed_values)
SELECT
  'perf_sparse_prop_' || jkey,
  jkey,
  'Sparse ' || jkey,
  -- Explicit cast: `value_type` is the `property_value_type` enum, and a
  -- CASE result is plain TEXT (unlike a bare string literal which can
  -- implicitly resolve to the enum).
  (CASE ptype
    WHEN 'text'   THEN 'STRING'
    WHEN 'number' THEN 'INTEGER'
    WHEN 'date'   THEN 'DATE'
    WHEN 'option' THEN 'STRING'
  END)::property_value_type,
  CASE ptype WHEN 'option' THEN 'Opt 1,Opt 2,Opt 3,Opt 4' ELSE NULL END
FROM _sparse_p_def
ON CONFLICT (id) DO NOTHING;

INSERT INTO name_property (id, property_id, remote_editable)
SELECT 'perf_sparse_np_' || jkey, 'perf_sparse_prop_' || jkey, TRUE
FROM _sparse_p_def
ON CONFLICT (id) DO NOTHING;

-- 4) Options for each of the 5 option-typed sparse properties (4 each = 20).
INSERT INTO property_v2_option (id, property_id, name, translation_key, deleted_datetime)
SELECT
  p.pid || '_opt_' || o.i,
  p.pid,
  'Opt ' || o.i,
  NULL,
  NULL
FROM _sparse_p_def p
CROSS JOIN generate_series(1, 4) AS o(i)
WHERE p.ptype = 'option'
ON CONFLICT (id) DO NOTHING;

-- 5) Variably-sparse value rows. For each (store, property) pair, populate
--    iff `((i * 31 + p_idx * 47) % 100) < density`. The (31, 47) coefficients
--    are coprime with 100 so neighbouring stores get different subsets.
INSERT INTO property_v2_value (id, table_name, record_id, property_id, value_text, value_number, value_real, value_date, value_option_id)
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
  FROM name WHERE id LIKE 'perf_store_%'
) s
CROSS JOIN _sparse_p_def p
WHERE ((s.sidx * 31 + p.idx * 47) % 100) < p.density
ON CONFLICT (id) DO NOTHING;

-- 6) Patch the legacy JSON blob with the same sparse keys so the legacy
--    paths can be benchmarked against the same data shape. Aggregates from
--    the rows just inserted — keyed by the catalog `jkey`. Existing keys are
--    preserved via `||` merge (sparse keys win on collision, but the dense
--    keys and sparse keys don't overlap so this is a no-op in practice).
UPDATE name
SET properties = (
  COALESCE(name.properties::jsonb, '{}'::jsonb)
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
        -- Store the option's display name, matching the dense seed's
        -- "favourite_bean":"Pinto" convention (rather than the option id).
        WHEN 'option' THEN to_jsonb((
          SELECT pvo.name FROM property_v2_option pvo
          WHERE pvo.id = pv.value_option_id
        ))
      END
    ) AS sparse_jsonb
  FROM property_v2_value pv
  JOIN _sparse_p_def p ON p.pid = pv.property_id
  WHERE pv.table_name = 'name'
  GROUP BY pv.record_id
) s
WHERE name.id = s.record_id AND name.id LIKE 'perf_store_%';

-- 7) Rebuild the JSONB twin column from the patched text JSON.
UPDATE name
SET properties_jsonb = properties::jsonb
WHERE id LIKE 'perf_store_%' AND properties IS NOT NULL;

COMMIT;
