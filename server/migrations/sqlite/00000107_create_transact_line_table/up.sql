-- Create transact_line table.

CREATE TABLE transact_line (
    id TEXT NOT NULL PRIMARY KEY,
    transact_id TEXT NOT NULL,
    type_of TEXT CHECK(type_of IN (
        'stock_out',
        'stock_in',
        'placeholder',
        'cash_in',
        'cash_out',
        'non_stock',
        'service')) NOT NULL,
    item_id TEXT NOT NULL,
    -- stock_line_id is null for placeholders, service items.
    stock_line_id TEXT,
    FOREIGN KEY(transact_id) REFERENCES transact(id),
    FOREIGN KEY(item_id) REFERENCES item(id),
    FOREIGN KEY(stock_line_id) REFERENCES stock_line(id)
)
