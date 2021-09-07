-- Create_line table.

CREATE TYPE transact_line_type AS ENUM ('stock_out', 'stock_in', 'placeholder', 'cash_in', 'cash_out', 'non_stock', 'service');

CREATE TABLE transact_line (
    id TEXT NOT NULL PRIMARY KEY,
    transact_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    -- item_line_id is null for placeholders, service items.
    item_line_id TEXT,
    type_of transact_line_type NOT NULL,
    FOREIGN KEY(transact_id) REFERENCES transact(id),
    FOREIGN KEY(item_id) REFERENCES item(id),
    FOREIGN KEY(item_line_id) REFERENCES item_line(id)
)
