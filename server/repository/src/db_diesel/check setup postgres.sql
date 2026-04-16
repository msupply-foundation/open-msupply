-- Setup: create stock_movement and item_ledger as simple tables with test data
-- Use with 'check postgres.sql' to verify DOS calculations

DROP TABLE IF EXISTS stock_movement CASCADE;
DROP TABLE IF EXISTS item_ledger CASCADE;

CREATE TABLE stock_movement (
    item_id TEXT,
    store_id TEXT,
    quantity DOUBLE PRECISION,
    datetime TIMESTAMP
);

CREATE TABLE item_ledger (
    item_id TEXT,
    store_id TEXT,
    running_balance DOUBLE PRECISION,
    datetime TIMESTAMP
);

-- Test: multiple_periods (item_a) - Expected DOS: 6.0 (old) / 4.0 (new)
-- +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
-- |                        | 20 | 21 | 22 | 23  | 24  | 25 | 26 | 27  | 28  | 29  | 30  |
-- +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
-- | end of day balance     | 3  | 3  | 0  | 0   | 0   | 3  | 0  | 0   | 0   | 0   | 0   |
-- +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
-- | full day without stock | no | no | no | yes | yes | no | no | yes | yes | yes | yes |
-- +------------------------+----+----+----+-----+-----+----+----+-----+-----+-----+-----+
INSERT INTO stock_movement VALUES ('item_a', 'store_a', 3, '2025-12-10 12:00:00');
INSERT INTO stock_movement VALUES ('item_a', 'store_a', -3, '2025-12-22 12:00:00');
INSERT INTO stock_movement VALUES ('item_a', 'store_a', 3, '2025-12-25 12:00:00');
INSERT INTO stock_movement VALUES ('item_a', 'store_a', -3, '2025-12-26 12:00:00');

INSERT INTO item_ledger VALUES ('item_a', 'store_a', 3, '2025-12-10 12:00:00');
INSERT INTO item_ledger VALUES ('item_a', 'store_a', 0, '2025-12-22 12:00:00');
INSERT INTO item_ledger VALUES ('item_a', 'store_a', 3, '2025-12-25 12:00:00');
INSERT INTO item_ledger VALUES ('item_a', 'store_a', 0, '2025-12-26 12:00:00');

-- Test: out_of_stock_at_start (item_b) - Expected DOS: 5.0 (old) / 0.0 (new)
-- +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
-- |                        | 19 | 20  | 21  | 22  | 23  | 24  | 25 | 26 | 27 | 28 | 29 | 30 |
-- +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
-- | end of day balance     | 0  | 0   | 0   | 0   | 0   | 0   | 10 | 10 | 10 | 10 | 10 | 10 |
-- +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
-- | full day without stock | no | yes | yes | yes | yes | yes | no | no | no | no | no | no |
-- +------------------------+----+-----+-----+-----+-----+-----+----+----+----+----+----+----+
INSERT INTO stock_movement VALUES ('item_b', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO stock_movement VALUES ('item_b', 'store_a', -10, '2025-12-06 12:00:00');
INSERT INTO stock_movement VALUES ('item_b', 'store_a', 10, '2025-12-25 12:00:00');

INSERT INTO item_ledger VALUES ('item_b', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO item_ledger VALUES ('item_b', 'store_a', 0, '2025-12-06 12:00:00');
INSERT INTO item_ledger VALUES ('item_b', 'store_a', 10, '2025-12-25 12:00:00');

-- Test: out_of_stock_at_end (item_c) - Expected DOS: 4.0 (old and new)
-- +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
-- |                        | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27  | 28  | 29  | 30  |
-- +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
-- | end of day balance     | 6  | 6  | 6  | 6  | 6  | 6  | 6  | 0  | 0   | 0   | 0   | 0   |
-- +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
-- | full day without stock |    | no | no | no | no | no | no | no | yes | yes | yes | yes |
-- +------------------------+----+----+----+----+----+----+----+----+-----+-----+-----+-----+
INSERT INTO stock_movement VALUES ('item_c', 'store_a', 6, '2025-12-10 12:00:00');
INSERT INTO stock_movement VALUES ('item_c', 'store_a', -6, '2025-12-26 12:00:00');

INSERT INTO item_ledger VALUES ('item_c', 'store_a', 6, '2025-12-10 12:00:00');
INSERT INTO item_ledger VALUES ('item_c', 'store_a', 0, '2025-12-26 12:00:00');

-- Test: out_of_stock_start_and_end (item_d) - Expected DOS: 9.0 (old) / 5.0 (new)
-- +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
-- |                        | 19 | 20  | 21  | 22  | 23  | 24 | 25 | 26  | 27  | 28  | 29  | 30  |
-- +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
-- | end of day balance     | 0  | 0   | 0   | 0   | 0   | 4  | 0  | 0   | 0   | 0   | 0   | 0   |
-- +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
-- | full day without stock |    | yes | yes | yes | yes | no | no | yes | yes | yes | yes | yes |
-- +------------------------+----+-----+-----+-----+-----+----+----+-----+-----+-----+-----+-----+
INSERT INTO stock_movement VALUES ('item_d', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO stock_movement VALUES ('item_d', 'store_a', -10, '2025-12-06 12:00:00');
INSERT INTO stock_movement VALUES ('item_d', 'store_a', 4, '2025-12-24 12:00:00');
INSERT INTO stock_movement VALUES ('item_d', 'store_a', -4, '2025-12-25 12:00:00');

INSERT INTO item_ledger VALUES ('item_d', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO item_ledger VALUES ('item_d', 'store_a', 0, '2025-12-06 12:00:00');
INSERT INTO item_ledger VALUES ('item_d', 'store_a', 4, '2025-12-24 12:00:00');
INSERT INTO item_ledger VALUES ('item_d', 'store_a', 0, '2025-12-25 12:00:00');

-- Test: fully_out_of_stock (item_e) - Expected DOS: 11.0 (old and new)
-- +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- |                        | 19 | 20  | 21  | 22  | 23  | 24  | 25  | 26  | 27  | 28  | 29  | 30  |
-- +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- | end of day balance     | 0  | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   |
-- +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- | full day without stock |    | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
-- +------------------------+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
INSERT INTO stock_movement VALUES ('item_e', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO stock_movement VALUES ('item_e', 'store_a', -10, '2025-12-06 12:00:00');

INSERT INTO item_ledger VALUES ('item_e', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO item_ledger VALUES ('item_e', 'store_a', 0, '2025-12-06 12:00:00');

-- Test: in_stock_whole_time (item_f) - Expected DOS: none (old and new)
INSERT INTO stock_movement VALUES ('item_f', 'store_a', 10, '2025-12-05 12:00:00');

INSERT INTO item_ledger VALUES ('item_f', 'store_a', 10, '2025-12-05 12:00:00');

-- Test: out_of_stock_first_day (item_g) - Expected DOS: 10.0 (old and new)
-- +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- |                        | 19 | 20 | 21  | 22  | 23  | 24  | 25  | 26  | 27  | 28  | 29  | 30  |
-- +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- | end of day balance     | 10 | 0  | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   | 0   |
-- +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
-- | full day without stock |    | no | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
-- +------------------------+----+----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
INSERT INTO stock_movement VALUES ('item_g', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO stock_movement VALUES ('item_g', 'store_a', -10, '2025-12-20 12:00:00');

INSERT INTO item_ledger VALUES ('item_g', 'store_a', 10, '2025-12-05 12:00:00');
INSERT INTO item_ledger VALUES ('item_g', 'store_a', 0, '2025-12-20 12:00:00');
