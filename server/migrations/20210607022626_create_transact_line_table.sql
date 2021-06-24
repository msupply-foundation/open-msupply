-- Create transact_line table.

CREATE TYPE transact_line_type AS ENUM ('stock_out', 'stock_in', 'placeholder', 'cash_in', 'cash_out', 'non_stock', 'service');

CREATE TABLE transact_line (
    -- Unique id assigned to each transact_line.
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    -- Id of the parent transact.
    transact_id VARCHAR(255) NOT NULL,
    -- Type of the transact_line.
    type_of transact_line_type NOT NULL,
-- Id of the item associated with the transact_line.
    item_id VARCHAR(255) NOT NULL,
    -- Id of the item_line associated with the transact_line (null for placeholders, service items).
    item_line_id VARCHAR(255)
)
