-- Create transact_line table

CREATE TYPE transact_line_type AS ENUM ('stock_out', 'stock_in', 'placeholder', 'cash_in', 'cash_out', 'non_stock', 'service');

CREATE TABLE transact_line (
    id varchar(255) NOT NULL PRIMARY KEY,
    transact_id varchar(255) NOT NULL,
    type_of transact_line_type NOT NULL,
    item_id varchar(255) NOT NULL,
    -- item_line_id is null for placeholders, service items
    item_line_id varchar(255)
)
