-- Create item table.
--
-- CREATE TABLE item (
--   ID ALPHA PRIMARY KEY,
--   item_name ALPHA
-- );
--
-- ID: unique id of the item.
-- item_name: name of the item.

CREATE TABLE item (
    id VARCHAR(255) NOT NULL PRIMARY KEY(id),
    item_name VARCHAR(255) NOT NULL
)