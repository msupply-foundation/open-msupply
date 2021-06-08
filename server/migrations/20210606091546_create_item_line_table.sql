-- Create item_line table.
--
-- CREATE TABLE item_line (
--   ID ALPHA PRIMARY KEY,
--   item_ID ALPHA,
--   store_ID ALPHA,  
--   batch TEXT,
--   quantity REAL
-- );
--
-- ID: unique id of the item_line.
-- item_id: id of the associated item.
-- store_id: id of the store the item_line represents stock of.
-- batch: name of the batch represented by the item_line.
-- quantity: quantity of stock represented by the item_line.

CREATE TABLE item_line (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    item_id VARCHAR(255) NOT NULL,
    store_id VARCHAR(255) NOT NULL,
    batch TEXT NOT NULL,
    quantity DOUBLE PRECISION NOT NULL
)