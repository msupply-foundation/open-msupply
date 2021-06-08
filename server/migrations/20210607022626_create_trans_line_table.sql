-- Create trans_line table.
--
-- CREATE TABLE trans_line (
--   ID ALPHA PRIMARY KEY,
--   transaction_ID ALPHA,
--   item_ID ALPHA,
--   item_line_ID ALPHA
-- );
--
-- ID: unique id of the trans_line.
-- transaction_ID: id of the parent transact.
-- item_ID: id of the item associated with the trans_line.
-- item_line_ID: id of the item_line associated with this trans_line (null for placeholders, service items).

CREATE TABLE trans_line (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_line_id VARCHAR(255)
)