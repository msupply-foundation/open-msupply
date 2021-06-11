-- Create item_line table.

CREATE TABLE item_line (
    -- Unique id assigned to each item_line.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the item associated with the item_line.
    item_id VARCHAR(255) NOT NULL,
    -- Id of the store with stock represented by the item_line.
    store_id VARCHAR(255) NOT NULL,
    -- Name of the batch represented by the item_line.
    batch TEXT NOT NULL,
    -- Quantity of stock represented by the item_line.
    quantity DOUBLE PRECISION NOT NULL
)