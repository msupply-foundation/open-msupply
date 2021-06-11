-- Create item table.

CREATE TABLE item (
    -- Unique id assigned to each item.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Name of the item.
    item_name VARCHAR(255) NOT NULL
)