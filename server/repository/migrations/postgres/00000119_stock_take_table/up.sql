CREATE TABLE stock_take (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    comment	TEXT,
    description TEXT,
    status TEXT,
    created_datetime TIMESTAMP NOT NULL,
    finalised_datetime TIMESTAMP,
    inventory_additions_id TEXT REFERENCES invoice(id),
    inventory_reductions_id TEXT REFERENCES invoice(id)
)