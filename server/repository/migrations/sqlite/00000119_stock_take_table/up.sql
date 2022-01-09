CREATE TABLE stock_take (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    comment	TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('NEW', 'FINALIZED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    finalised_datetime TEXT,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
)