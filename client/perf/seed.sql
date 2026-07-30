-- Deterministic fixture data for the frontend perf harness.
--
-- Everything created here is id-prefixed `perf-` so `unseed.sql` can remove it
-- cleanly. Re-running is safe (delete-then-insert).
--
-- Run it via ./seed.sh, which resolves the database connection from the server
-- config (see that script). Overrides pass straight through:
--
--   ./seed.sh                       -- defaults: 150 fat lines, 300 shipments
--   ./seed.sh -v fat_lines=400      -- bigger detail-view fixture
--   ./seed.sh -v store_code=HUF     -- seed into a different store
--
-- Logs in as Admin/pass in the app.

\set ON_ERROR_STOP on

-- Defaults, only applied when not passed with -v
\if :{?fat_lines} \else \set fat_lines 150 \endif
\if :{?list_shipments} \else \set list_shipments 300 \endif
\if :{?items} \else \set items 400 \endif
\if :{?stock_per_item} \else \set stock_per_item 6 \endif
\if :{?store_code} \else \set store_code 'GEN' \endif

-- Resolve the target store by CODE, not by id: store ids differ between
-- datafiles, and `invoice.store_id` / `stock_line.store_id` are FK-constrained,
-- so a pinned id from one machine fails ~200 lines in with a constraint
-- violation. Fail here instead, with something readable.
-- Guard in SQL rather than with \if / \quit: psql's \quit ignores an exit code
-- (so a caller could not detect the failure), and \warn does not interpolate
-- variables inside a quoted string. RAISE + ON_ERROR_STOP gives both a readable
-- message and a non-zero exit.
-- The code is handed to the server as a setting rather than interpolated into the
-- DO body: psql does not substitute :'var' inside a dollar-quoted string, so the
-- `:` would reach the server as literal SQL and fail to parse.
SELECT set_config('perf.store_code', :'store_code', false);

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM store WHERE code = current_setting('perf.store_code')
  ) THEN
    RAISE EXCEPTION
      'perf fixture: no store with code "%" in this database. Pass -v store_code=XXX (default GEN).',
      current_setting('perf.store_code');
  END IF;
END $guard$;

SELECT id AS store_id FROM store WHERE code = :'store_code' \gset

BEGIN;

-- ---------------------------------------------------------------------------
-- Teardown (children first)
--
-- Deleting by `perf-` prefix alone is not enough: once the app has been driven
-- against the fixture, it has written its OWN rows against it with generated
-- UUIDs — saving a line-edit adds `invoice_line`s to a perf invoice. So scope
-- child rows by relationship as well as by prefix.
--
-- Deliberately NOT deleted: `invoice_line`s that live on a NON-perf invoice but
-- reference perf stock. Those belong to someone's real shipment, and quietly
-- removing them would damage real data. If any exist, the `stock_line` delete
-- below fails on its FK — which is the correct outcome; resolve it by hand.
-- ---------------------------------------------------------------------------
DELETE FROM vvm_status_log
 WHERE stock_line_id LIKE 'perf-%'
    OR invoice_line_id IN (
         SELECT id FROM invoice_line WHERE invoice_id LIKE 'perf-%'
       );
DELETE FROM invoice_line WHERE invoice_id LIKE 'perf-%' OR id LIKE 'perf-%';
DELETE FROM invoice      WHERE id LIKE 'perf-%';
DELETE FROM stock_line   WHERE id LIKE 'perf-%';
DELETE FROM item_link    WHERE id LIKE 'perf-%';
DELETE FROM item         WHERE id LIKE 'perf-%';
DELETE FROM name_link    WHERE id LIKE 'perf-%';
DELETE FROM name         WHERE id LIKE 'perf-%';

-- ---------------------------------------------------------------------------
-- Customer to ship to
-- ---------------------------------------------------------------------------
-- NOTE: several columns are nullable in the DB but non-Option in the Rust row
-- structs (name: is_manufacturer/is_donor/on_hold; item: is_vaccine/
-- vaccine_doses/volume_per_pack; stock_line: total_volume/volume_per_pack).
-- Leaving them NULL makes the server fail the whole query with
-- DIESEL_DESERIALIZATION_ERROR (UnexpectedNullError) — which takes out the real
-- rows too, not just the fixture. Every such column is set explicitly below.
INSERT INTO name (
  id, name, code, type, is_customer, is_supplier,
  is_manufacturer, is_donor, on_hold, is_deceased, is_sync_update,
  margin, freight_factor
)
VALUES (
  'perf-customer', 'Perf Test Customer', 'PERFCUST', 'FACILITY', true, false,
  false, false, false, false, false, 0, 1
);

INSERT INTO name_link (id, name_id) VALUES ('perf-customer-link', 'perf-customer');

-- ---------------------------------------------------------------------------
-- Items. Names are shuffled (not id-ordered) so sorting does real work rather
-- than confirming an already-sorted list.
-- ---------------------------------------------------------------------------
INSERT INTO item (
  id, name, code, type, default_pack_size, legacy_record, is_active,
  is_vaccine, vaccine_doses, volume_per_pack, unit_id
)
SELECT
  'perf-item-' || lpad(n::text, 5, '0'),
  (ARRAY['Amoxicillin','Paracetamol','Ibuprofen','Metformin','Ceftriaxone',
         'Oxytocin','Gentamicin','Ringer Lactate','Zinc Sulfate','Albendazole',
         'Artemether','Salbutamol','Omeprazole','Furosemide','Diazepam',
         'Hydralazine','Misoprostol','Nifedipine','Tranexamic Acid','Vitamin A'
        ])[1 + (n * 7) % 20]
    || ' ' || (50 + (n * 13) % 950)::text || 'mg'
    || ' (' || lpad(n::text, 4, '0') || ')',
  'PERF' || lpad(n::text, 5, '0'),
  'STOCK',
  (ARRAY[1, 10, 20, 50, 100])[1 + n % 5],
  '',
  true,
  false,
  0,
  0.0,
  (SELECT id FROM unit ORDER BY "index" LIMIT 1)
FROM generate_series(1, :items) AS n;

INSERT INTO item_link (id, item_id)
SELECT id, id FROM item WHERE id LIKE 'perf-item-%';

-- ---------------------------------------------------------------------------
-- Stock lines. `stock_per_item` batches each, with staggered expiries — this is
-- what the OutboundLineEdit allocation table iterates over, so it is a direct
-- driver of that modal's cost.
-- ---------------------------------------------------------------------------
INSERT INTO stock_line (
  id, store_id, item_link_id, batch, expiry_date,
  cost_price_per_pack, sell_price_per_pack,
  available_number_of_packs, total_number_of_packs, pack_size, on_hold,
  total_volume, volume_per_pack
)
SELECT
  'perf-stock-' || lpad(n::text, 5, '0') || '-' || b,
  :'store_id',
  'perf-item-' || lpad(n::text, 5, '0'),
  'B' || lpad(n::text, 5, '0') || '-' || b,
  (DATE '2027-01-01' + ((n * 17 + b * 31) % 900))::date,
  round((2 + (n % 40) * 0.35)::numeric, 2),
  round((5 + (n % 40) * 0.55)::numeric, 2),
  500 + (n * 7 + b * 11) % 4500,
  500 + (n * 7 + b * 11) % 4500,
  (ARRAY[1, 10, 20, 50, 100])[1 + n % 5],
  false,
  0.0,
  0.0
FROM generate_series(1, :items) AS n,
     generate_series(1, :stock_per_item) AS b;

-- ---------------------------------------------------------------------------
-- The fat shipment: status NEW so lines are editable. This is the detail-view
-- and line-edit scenario under test.
-- ---------------------------------------------------------------------------
INSERT INTO invoice (
  id, store_id, name_link_id, invoice_number, type, status,
  on_hold, created_datetime, currency_rate, comment, their_reference
)
VALUES (
  'perf-outbound-fat', :'store_id', 'perf-customer-link', 990001,
  'OUTBOUND_SHIPMENT', 'NEW', false, now(), 1.0,
  'perf fixture: fat shipment', 'PERF-FAT'
);

INSERT INTO invoice_line (
  id, invoice_id, item_link_id, item_name, item_code, stock_line_id,
  batch, expiry_date, cost_price_per_pack, sell_price_per_pack,
  total_before_tax, total_after_tax, type, number_of_packs, pack_size,
  volume_per_pack
)
SELECT
  'perf-fatline-' || lpad(n::text, 5, '0'),
  'perf-outbound-fat',
  i.id,
  i.name,
  i.code,
  s.id,
  s.batch,
  s.expiry_date,
  s.cost_price_per_pack,
  s.sell_price_per_pack,
  round((s.sell_price_per_pack * (1 + n % 9))::numeric, 2),
  round((s.sell_price_per_pack * (1 + n % 9))::numeric, 2),
  'STOCK_OUT',
  1 + n % 9,
  s.pack_size,
  0.0
FROM generate_series(1, :fat_lines) AS n
JOIN item i ON i.id = 'perf-item-' || lpad(n::text, 5, '0')
-- first batch of each item
JOIN stock_line s ON s.id = 'perf-stock-' || lpad(n::text, 5, '0') || '-1';

-- ---------------------------------------------------------------------------
-- List-view volume: many small shipments across mixed statuses, so the list
-- page's sort / page / count paths see a realistic row count.
-- ---------------------------------------------------------------------------
INSERT INTO invoice (
  id, store_id, name_link_id, invoice_number, type, status,
  on_hold, created_datetime, allocated_datetime, picked_datetime,
  currency_rate, comment, their_reference
)
SELECT
  'perf-outbound-list-' || lpad(n::text, 4, '0'),
  :'store_id',
  'perf-customer-link',
  991000 + n,
  'OUTBOUND_SHIPMENT',
  (ARRAY['NEW','ALLOCATED','PICKED','SHIPPED','VERIFIED']::invoice_status[])[1 + n % 5],
  false,
  now() - (n || ' hours')::interval,
  CASE WHEN n % 5 > 0 THEN now() - (n || ' hours')::interval END,
  CASE WHEN n % 5 > 1 THEN now() - (n || ' hours')::interval END,
  1.0,
  'perf fixture ' || n,
  'PERF-' || lpad(n::text, 4, '0')
FROM generate_series(1, :list_shipments) AS n;

INSERT INTO invoice_line (
  id, invoice_id, item_link_id, item_name, item_code, stock_line_id,
  batch, expiry_date, cost_price_per_pack, sell_price_per_pack,
  total_before_tax, total_after_tax, type, number_of_packs, pack_size,
  volume_per_pack
)
SELECT
  'perf-listline-' || lpad(n::text, 4, '0') || '-' || k,
  'perf-outbound-list-' || lpad(n::text, 4, '0'),
  i.id, i.name, i.code, s.id, s.batch, s.expiry_date,
  s.cost_price_per_pack, s.sell_price_per_pack,
  round(s.sell_price_per_pack::numeric, 2),
  round(s.sell_price_per_pack::numeric, 2),
  'STOCK_OUT', 1 + k, s.pack_size, 0.0
-- Explicit CROSS JOIN (not a comma) so the later ON clauses may reference n/k:
-- comma binds looser than JOIN and would make those references invalid.
FROM generate_series(1, :list_shipments) AS n
CROSS JOIN generate_series(1, 2) AS k
JOIN item i
  ON i.id = 'perf-item-' || lpad((1 + (n * 3 + k) % :items)::text, 5, '0')
JOIN stock_line s
  ON s.id = 'perf-stock-' || lpad((1 + (n * 3 + k) % :items)::text, 5, '0') || '-2';

COMMIT;

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
SELECT 'items'          AS fixture, count(*) FROM item       WHERE id LIKE 'perf-%'
UNION ALL SELECT 'stock lines',     count(*) FROM stock_line WHERE id LIKE 'perf-%'
UNION ALL SELECT 'shipments',       count(*) FROM invoice    WHERE id LIKE 'perf-%'
UNION ALL SELECT 'fat shipment lines', count(*) FROM invoice_line WHERE invoice_id = 'perf-outbound-fat';
