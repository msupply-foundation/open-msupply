-- Minimal standalone perf-test schema. Mirrors the columns and baseline
-- indexes the OMS schema exposes on `name` / `property_v2_value` /
-- `property_v2_option`, but drops every FK, name_link/store linkage, and
-- non-perf-relevant column. Works on a blank SQLite or Postgres — no OMS
-- migrations required.
--
-- Substitute the placeholders before running:
--   __SIZE__        — the N-store partition this schema variant serves
--                   (e.g. 1000, 10000, 100000)
--   __JSONB_TYPE__  — `jsonb` on Postgres, `TEXT` on SQLite (SQLite's json
--                   functions accept TEXT/BLOB)
--
-- Idempotent: CREATE …​ IF NOT EXISTS everywhere. Safe to run repeatedly.

-- ----- Per-size: name rows + JSON twin --------------------------------------
CREATE TABLE IF NOT EXISTS perf_name___SIZE__ (
    id              TEXT PRIMARY KEY,
    properties      TEXT,
    properties_jsonb __JSONB_TYPE__
);

-- ----- Per-size: relational property values ---------------------------------
CREATE TABLE IF NOT EXISTS perf_pv2_value___SIZE__ (
    id              TEXT PRIMARY KEY,
    table_name      TEXT NOT NULL,
    record_id       TEXT NOT NULL,
    property_id     TEXT NOT NULL,
    value_text      TEXT,
    value_number    INTEGER,
    value_real      REAL,
    value_date      DATE,
    value_option_id TEXT
);

-- App-level indexes that the OMS schema ships with — keep the unindexed
-- numbers honest (i.e. measure against the same baseline cardinality help
-- the planner has in production).
CREATE INDEX IF NOT EXISTS idx_perf_pv2_value_lookup___SIZE__
    ON perf_pv2_value___SIZE__ (property_id, table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_perf_pv2_value_property_id___SIZE__
    ON perf_pv2_value___SIZE__ (property_id);
CREATE INDEX IF NOT EXISTS idx_perf_pv2_value_record___SIZE__
    ON perf_pv2_value___SIZE__ (table_name, record_id);

-- ----- Shared across sizes: option id/name table ---------------------------
-- Option ids are stable (`perf_opt_bean_*` and `perf_sparse_propv2_opt_*_opt_*`)
-- so one shared table is enough; sort queries that ORDER BY pvo.name read
-- from this table the same way regardless of which size's pv table they join.
--
-- Columns mirror OMS `property_v2_option` so the same INSERT statements
-- work against both schemas (no per-mode INSERT branching needed). The
-- FK-target columns are nullable here because standalone has no
-- property_v2 table to reference.
CREATE TABLE IF NOT EXISTS perf_pv2_option (
    id               TEXT PRIMARY KEY,
    property_id      TEXT,
    name             TEXT NOT NULL,
    translation_key  TEXT,
    deleted_datetime TIMESTAMP
);

-- Dense bean options (idempotent).
INSERT INTO perf_pv2_option (id, property_id, name, translation_key, deleted_datetime) VALUES
  ('perf_opt_bean_black',  'perf_propv2_favourite_bean', 'Black',  NULL, NULL),
  ('perf_opt_bean_pinto',  'perf_propv2_favourite_bean', 'Pinto',  NULL, NULL),
  ('perf_opt_bean_navy',   'perf_propv2_favourite_bean', 'Navy',   NULL, NULL),
  ('perf_opt_bean_kidney', 'perf_propv2_favourite_bean', 'Kidney', NULL, NULL),
  ('perf_opt_bean_lima',   'perf_propv2_favourite_bean', 'Lima',   NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Sparse options (4 per sparse-option-property × 5 = 20). Hand-rolled
-- rather than generated via a CTE because SQLite's parser has an
-- ambiguity around `CROSS JOIN x ON CONFLICT …`. ID/name format matches
-- the sparse seed's `value_option_id` reference exactly.
INSERT INTO perf_pv2_option (id, property_id, name, translation_key, deleted_datetime) VALUES
  ('perf_sparse_propv2_opt_01_opt_1', 'perf_sparse_propv2_opt_01', 'Opt 1', NULL, NULL),
  ('perf_sparse_propv2_opt_01_opt_2', 'perf_sparse_propv2_opt_01', 'Opt 2', NULL, NULL),
  ('perf_sparse_propv2_opt_01_opt_3', 'perf_sparse_propv2_opt_01', 'Opt 3', NULL, NULL),
  ('perf_sparse_propv2_opt_01_opt_4', 'perf_sparse_propv2_opt_01', 'Opt 4', NULL, NULL),
  ('perf_sparse_propv2_opt_02_opt_1', 'perf_sparse_propv2_opt_02', 'Opt 1', NULL, NULL),
  ('perf_sparse_propv2_opt_02_opt_2', 'perf_sparse_propv2_opt_02', 'Opt 2', NULL, NULL),
  ('perf_sparse_propv2_opt_02_opt_3', 'perf_sparse_propv2_opt_02', 'Opt 3', NULL, NULL),
  ('perf_sparse_propv2_opt_02_opt_4', 'perf_sparse_propv2_opt_02', 'Opt 4', NULL, NULL),
  ('perf_sparse_propv2_opt_03_opt_1', 'perf_sparse_propv2_opt_03', 'Opt 1', NULL, NULL),
  ('perf_sparse_propv2_opt_03_opt_2', 'perf_sparse_propv2_opt_03', 'Opt 2', NULL, NULL),
  ('perf_sparse_propv2_opt_03_opt_3', 'perf_sparse_propv2_opt_03', 'Opt 3', NULL, NULL),
  ('perf_sparse_propv2_opt_03_opt_4', 'perf_sparse_propv2_opt_03', 'Opt 4', NULL, NULL),
  ('perf_sparse_propv2_opt_04_opt_1', 'perf_sparse_propv2_opt_04', 'Opt 1', NULL, NULL),
  ('perf_sparse_propv2_opt_04_opt_2', 'perf_sparse_propv2_opt_04', 'Opt 2', NULL, NULL),
  ('perf_sparse_propv2_opt_04_opt_3', 'perf_sparse_propv2_opt_04', 'Opt 3', NULL, NULL),
  ('perf_sparse_propv2_opt_04_opt_4', 'perf_sparse_propv2_opt_04', 'Opt 4', NULL, NULL),
  ('perf_sparse_propv2_opt_05_opt_1', 'perf_sparse_propv2_opt_05', 'Opt 1', NULL, NULL),
  ('perf_sparse_propv2_opt_05_opt_2', 'perf_sparse_propv2_opt_05', 'Opt 2', NULL, NULL),
  ('perf_sparse_propv2_opt_05_opt_3', 'perf_sparse_propv2_opt_05', 'Opt 3', NULL, NULL),
  ('perf_sparse_propv2_opt_05_opt_4', 'perf_sparse_propv2_opt_05', 'Opt 4', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
