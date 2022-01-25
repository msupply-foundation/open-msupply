CREATE TABLE stock_take (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    stock_take_number INTEGER NOT NULL,
    comment	TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('NEW', 'FINALISED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    finalised_datetime TEXT,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)