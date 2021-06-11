-- Create transaction_line table.

CREATE TABLE transaction_line (
    -- Unique id assigned to each transaction_line.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the parent transaction.
    transaction_id VARCHAR(255) NOT NULL,
    -- Id of the item associated with the transaction_line.
    item_id VARCHAR(255) NOT NULL,
    -- Id of the item_line associated with the transaction_line (null for placeholders, service items).
    item_line_id VARCHAR(255)
)