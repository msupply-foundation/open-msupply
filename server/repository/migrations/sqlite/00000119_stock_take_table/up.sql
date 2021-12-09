CREATE TABLE stock_take (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    comment	TEXT,
    description TEXT,
    status TEXT,
    created_datetime TEXT NOT NULL,
    finalised_datetime TEXT,
    inventory_additions_id TEXT REFERENCES invoice(id),
    inventory_reductions_id TEXT REFERENCES invoice(id)
)