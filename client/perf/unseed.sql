-- Remove everything seed.sql created. Children first.
-- Run via `./seed.sh --clean`, which resolves the DB connection for you.
--
-- Deleting by `perf-` prefix alone is not enough: once the app has been driven
-- against the fixture, it has written its OWN rows against it with generated
-- UUIDs — saving a line-edit adds `invoice_line`s to a perf invoice. So child
-- rows are scoped by relationship as well as by prefix.
--
-- Deliberately NOT deleted: `invoice_line`s on a NON-perf invoice that reference
-- perf stock. Those belong to someone's real shipment, and quietly removing them
-- would damage real data. If any exist the `stock_line` delete fails on its FK,
-- which is the correct outcome — resolve it by hand.
\set ON_ERROR_STOP on

BEGIN;
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
COMMIT;

SELECT 'remaining perf rows' AS check, (
  (SELECT count(*) FROM invoice_line WHERE id LIKE 'perf-%' OR invoice_id LIKE 'perf-%') +
  (SELECT count(*) FROM invoice      WHERE id LIKE 'perf-%') +
  (SELECT count(*) FROM stock_line   WHERE id LIKE 'perf-%') +
  (SELECT count(*) FROM item         WHERE id LIKE 'perf-%') +
  (SELECT count(*) FROM name         WHERE id LIKE 'perf-%')
) AS count;
